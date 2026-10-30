import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Panel3D, CollisionWarning } from '../types/cad';
import { DriverModel } from '../types/driver';
import { EnclosureConfig } from '../types/enclosure';
import { 
  Box, 
  Eye, 
  Maximize2, 
  Minimize2, 
  Compass, 
  Layers, 
  AlertTriangle,
  ZoomIn,
  ZoomOut
} from 'lucide-react';

interface Viewport3DProps {
  panels: Panel3D[];
  driver: DriverModel;
  enclosure: EnclosureConfig;
  warnings: CollisionWarning[];
  isMaximized?: boolean;
  onToggleMaximize?: () => void;
}

export type ViewMode = 'solid' | 'xray' | 'wireframe' | 'exploded';

function createPanelGeometry(panel: Panel3D): THREE.BufferGeometry {
  const hasThroughCutouts = panel.cutouts.some(cutout => cutout.type !== 'driver_rebate');
  if (!hasThroughCutouts) return new THREE.BoxGeometry(panel.widthMm, panel.heightMm, panel.thicknessMm);

  const shape = new THREE.Shape();
  shape.moveTo(-panel.widthMm / 2, -panel.heightMm / 2);
  shape.lineTo(panel.widthMm / 2, -panel.heightMm / 2);
  shape.lineTo(panel.widthMm / 2, panel.heightMm / 2);
  shape.lineTo(-panel.widthMm / 2, panel.heightMm / 2);
  shape.closePath();

  panel.cutouts.filter(cutout => cutout.type !== 'driver_rebate').forEach(cutout => {
    const hole = new THREE.Path();
    if (cutout.widthMm && cutout.heightMm) {
      const halfW = cutout.widthMm / 2;
      const halfH = cutout.heightMm / 2;
      hole.moveTo(cutout.xMm - halfW, cutout.yMm - halfH);
      hole.lineTo(cutout.xMm - halfW, cutout.yMm + halfH);
      hole.lineTo(cutout.xMm + halfW, cutout.yMm + halfH);
      hole.lineTo(cutout.xMm + halfW, cutout.yMm - halfH);
      hole.closePath();
    } else if (cutout.diameterMm) {
      hole.absarc(cutout.xMm, cutout.yMm, cutout.diameterMm / 2, 0, Math.PI * 2, true);
      hole.closePath();
    }
    shape.holes.push(hole);
  });

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: panel.thicknessMm,
    bevelEnabled: false,
    curveSegments: 48
  });
  geometry.translate(0, 0, -panel.thicknessMm / 2);
  return geometry;
}

function disposeObject(object: THREE.Object3D): void {
  object.traverse(child => {
    const mesh = child as THREE.Mesh;
    if (mesh.geometry) mesh.geometry.dispose();
    if (Array.isArray(mesh.material)) mesh.material.forEach(material => material.dispose());
    else if (mesh.material) mesh.material.dispose();
  });
}

export const Viewport3D: React.FC<Viewport3DProps> = ({
  panels,
  driver,
  enclosure,
  warnings,
  isMaximized = false,
  onToggleMaximize
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('solid');
  const [explodedDistance, setExplodedDistance] = useState<number>(60);
  const [showDriver, setShowDriver] = useState<boolean>(true);
  const [showWireframeOverlay, setShowWireframeOverlay] = useState<boolean>(true);

  // References for Three.js state
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneGroupRef = useRef<THREE.Group | null>(null);
  const isDraggingRef = useRef<boolean>(false);
  const previousMousePositionRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const touchDistanceRef = useRef<number | null>(null);
  const cameraSphericalRef = useRef<{ radius: number; theta: number; phi: number }>({
    radius: 950,
    theta: Math.PI / 4,
    phi: Math.PI / 3
  });

  // Setup Three.js scene once
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x101216);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 10, 5000);
    cameraRef.current = camera;
    updateCameraPosition();

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    rendererRef.current = renderer;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const group = new THREE.Group();
    scene.add(group);
    sceneGroupRef.current = group;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xfffaed, 1.4);
    dirLight1.position.set(600, 800, 700);
    dirLight1.castShadow = true;
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x90b0e0, 0.7);
    dirLight2.position.set(-600, -400, -500);
    scene.add(dirLight2);

    const grid = new THREE.GridHelper(1400, 28, 0x3f3f46, 0x27272a);
    grid.position.y = -enclosure.outerHeightMm / 2 - 20;
    scene.add(grid);

    let reqId: number;
    const animate = () => {
      reqId = requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!container || !camera || !renderer) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(reqId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      if (container) container.innerHTML = '';
    };
  }, []);

  const updateCameraPosition = () => {
    if (!cameraRef.current) return;
    const { radius, theta, phi } = cameraSphericalRef.current;
    cameraRef.current.position.x = radius * Math.sin(phi) * Math.sin(theta);
    cameraRef.current.position.y = radius * Math.cos(phi);
    cameraRef.current.position.z = radius * Math.sin(phi) * Math.cos(theta);
    cameraRef.current.lookAt(0, 0, 0);
  };

  // Update Geometry whenever panels, driver, enclosure or viewMode changes
  useEffect(() => {
    const group = sceneGroupRef.current;
    if (!group) return;

    while (group.children.length > 0) {
      const obj = group.children[0];
      group.remove(obj);
      disposeObject(obj);
    }

    const isXRay = viewMode === 'xray';
    const isWireframe = viewMode === 'wireframe';
    const isExploded = viewMode === 'exploded';
    const isBandpass = enclosure.type === 'bandpass_4th' || enclosure.type === 'bandpass_6th';
    const isTube = enclosure.type === 'bass_reflex_tube' || enclosure.port.type === 'round' || enclosure.port.type === 'aeroport';

    // 1. Build Panels
    panels.forEach((panel) => {
      if (!panel.visible) return;

      const pW = panel.widthMm;
      const pH = panel.heightMm;
      const pT = panel.thicknessMm;

      const geometry = createPanelGeometry(panel);

      let baseColor = panel.isPortPanel 
        ? 0xd97706 
        : panel.id === 'panel_internal_baffle'
          ? 0x3b82f6 // niebieska przegroda wewnętrzna
          : panel.isBracing 
            ? 0x0284c7 
            : 0xa16207;

      if (panel.id === 'panel_front' || panel.id === 'panel_front_double') {
        baseColor = 0xb45309;
      }

      const material = new THREE.MeshStandardMaterial({
        color: baseColor,
        roughness: 0.65,
        metalness: 0.1,
        transparent: isXRay,
        opacity: isXRay ? (panel.id === 'panel_internal_baffle' ? 0.85 : (panel.isPortPanel ? 0.75 : 0.25)) : 1.0,
        wireframe: isWireframe
      });

      const mesh = new THREE.Mesh(geometry, material);

      let posX = panel.positionMm[0];
      let posY = panel.positionMm[1];
      let posZ = panel.positionMm[2];

      if (isExploded) {
        const factor = explodedDistance;
        if (panel.id === 'panel_top') posY += factor;
        if (panel.id === 'panel_bottom') posY -= factor;
        if (panel.id === 'panel_front' || panel.id === 'panel_front_double') posZ += factor;
        if (panel.id === 'panel_back') posZ -= factor;
        if (panel.id === 'panel_left') posX -= factor;
        if (panel.id === 'panel_right') posX += factor;
      }

      mesh.position.set(posX, posY, posZ);
      mesh.rotation.set(panel.rotationRad[0], panel.rotationRad[1], panel.rotationRad[2]);
      mesh.castShadow = !isXRay;
      mesh.receiveShadow = !isXRay;

      if (showWireframeOverlay && !isWireframe && !isXRay) {
        const edges = new THREE.EdgesGeometry(geometry);
        const line = new THREE.LineSegments(
          edges,
          new THREE.LineBasicMaterial({ color: 0x451a03, linewidth: 1 })
        );
        mesh.add(line);
      }

      group.add(mesh);
    });

    // 2. Build 3D Tube Port(s) when Tube / Aeroport is active
    if (isTube && enclosure.type !== 'sealed') {
      const count = enclosure.port.tubeCount || 1;
      const dia = enclosure.port.diameterMm || 100;
      const len = enclosure.port.lengthMm || 280;
      const frontZ = (enclosure.outerDepthMm / 2) + (isExploded ? explodedDistance : 0);
      const portY = isBandpass ? 0 : enclosure.outerHeightMm / 4;

      for (let tc = 0; tc < count; tc++) {
        const tubeX = count === 1 ? 0 : (tc === 0 ? -enclosure.outerWidthMm / 4 : enclosure.outerWidthMm / 4);
        
        const tubeGeo = new THREE.CylinderGeometry(dia / 2, dia / 2, len, 32, 1, true);
        tubeGeo.rotateX(Math.PI / 2);
        const tubeMat = new THREE.MeshStandardMaterial({
          color: 0x22c55e,
          roughness: 0.3,
          metalness: 0.2,
          transparent: isXRay,
          opacity: isXRay ? 0.7 : 0.95,
          side: THREE.DoubleSide
        });
        const tubeMesh = new THREE.Mesh(tubeGeo, tubeMat);
        tubeMesh.position.set(tubeX, portY, frontZ - len / 2);
        group.add(tubeMesh);

        // Flange rim on front
        if (enclosure.port.hasFlare) {
          const flareGeo = new THREE.TorusGeometry(dia / 2 + 8, 8, 16, 32);
          const flareMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.4 });
          const flareMesh = new THREE.Mesh(flareGeo, flareMat);
          flareMesh.position.set(tubeX, portY, frontZ);
          group.add(flareMesh);
        }
      }
    }

    // 3. Build 3D Subwoofer Drivers
    if (showDriver) {
      const geom = driver.geometry;
      const internalBaffle = panels.find((p) => p.id === 'panel_internal_baffle');
      
      let driverMountZ = (enclosure.outerDepthMm / 2) + (isExploded ? explodedDistance : 0);
      let driverMountY = (isTube && !isBandpass ? -enclosure.outerHeightMm / 8 : 0) + (enclosure.driverOffsetYOffsetMm || 0);

      if (isBandpass && internalBaffle) {
        // W Bandpass głośnik jest w środku na przegrodzie!
        driverMountZ = internalBaffle.positionMm[2];
        driverMountY = enclosure.driverOffsetYOffsetMm || 0;
      }

      const spacing = enclosure.outerWidthMm / (enclosure.driverCount + 1);
      const userOffX = enclosure.driverOffsetXOffsetMm || 0;

      for (let d = 0; d < enclosure.driverCount; d++) {
        const driverX = (-enclosure.outerWidthMm / 2 + spacing * (d + 1)) + userOffX;
        const driverGroup = new THREE.Group();

        // Flange ring
        const flangeGeo = new THREE.CylinderGeometry(
          geom.outerDiameterMm / 2,
          geom.outerDiameterMm / 2,
          geom.flangeThicknessMm,
          48
        );
        flangeGeo.rotateX(Math.PI / 2);
        const basketMat = new THREE.MeshStandardMaterial({
          color: 0x18181b,
          roughness: 0.35,
          metalness: 0.85
        });
        const flangeMesh = new THREE.Mesh(flangeGeo, basketMat);
        driverGroup.add(flangeMesh);

        // Surround
        const surroundRadius = (geom.cutoutDiameterMm / 2) * 0.92;
        const surroundTube = 12;
        const surroundGeo = new THREE.TorusGeometry(surroundRadius, surroundTube, 16, 48);
        const rubberMat = new THREE.MeshStandardMaterial({
          color: 0x09090b,
          roughness: 0.95,
          metalness: 0.05
        });
        const surroundMesh = new THREE.Mesh(surroundGeo, rubberMat);
        surroundMesh.position.z = 6;
        driverGroup.add(surroundMesh);

        // Cone
        const coneRadius = surroundRadius - surroundTube;
        const coneGeo = new THREE.ConeGeometry(coneRadius, 38, 36, 1, true);
        coneGeo.rotateX(-Math.PI / 2);
        const coneMat = new THREE.MeshStandardMaterial({
          color: 0x27272a,
          roughness: 0.4,
          metalness: 0.2
        });
        const coneMesh = new THREE.Mesh(coneGeo, coneMat);
        coneMesh.position.z = -12;
        driverGroup.add(coneMesh);

        // Dust cap
        const dustCapGeo = new THREE.SphereGeometry(coneRadius * 0.52, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2);
        dustCapGeo.rotateX(Math.PI / 2);
        const dustCapMat = new THREE.MeshStandardMaterial({
          color: 0x18181b,
          roughness: 0.2,
          metalness: 0.3
        });
        const dustCapMesh = new THREE.Mesh(dustCapGeo, dustCapMat);
        dustCapMesh.position.z = 2;
        driverGroup.add(dustCapMesh);

        // Magnet motor
        const magnetGeo = new THREE.CylinderGeometry(
          geom.magnetDiameterMm / 2,
          geom.magnetDiameterMm / 2,
          geom.mountingDepthMm * 0.55,
          36
        );
        magnetGeo.rotateX(Math.PI / 2);
        const magnetMat = new THREE.MeshStandardMaterial({
          color: 0x3f3f46,
          roughness: 0.4,
          metalness: 0.75
        });
        const magnetMesh = new THREE.Mesh(magnetGeo, magnetMat);
        magnetMesh.position.z = -geom.mountingDepthMm * 0.65;
        driverGroup.add(magnetMesh);

        // Pole vent hole
        const poleVentGeo = new THREE.CylinderGeometry(18, 18, 10, 24);
        poleVentGeo.rotateX(Math.PI / 2);
        const ventMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
        const poleVentMesh = new THREE.Mesh(poleVentGeo, ventMat);
        poleVentMesh.position.z = -geom.mountingDepthMm * 0.92;
        driverGroup.add(poleVentMesh);

        driverGroup.position.set(driverX, driverMountY, driverMountZ - geom.flangeThicknessMm / 2);
        group.add(driverGroup);
      }
    }
  }, [panels, driver, enclosure, viewMode, explodedDistance, showDriver, showWireframeOverlay]);

  // Mouse Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    const deltaX = e.clientX - previousMousePositionRef.current.x;
    const deltaY = e.clientY - previousMousePositionRef.current.y;

    const spherical = cameraSphericalRef.current;
    spherical.theta -= deltaX * 0.006;
    spherical.phi = Math.max(0.05, Math.min(Math.PI - 0.05, spherical.phi - deltaY * 0.006));

    updateCameraPosition();
    previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleWheel = (e: React.WheelEvent) => {
    const spherical = cameraSphericalRef.current;
    spherical.radius = Math.max(300, Math.min(2200, spherical.radius + e.deltaY * 0.7));
    updateCameraPosition();
  };

  // Mobile Touch Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      isDraggingRef.current = true;
      previousMousePositionRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else if (e.touches.length === 2) {
      isDraggingRef.current = false;
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      touchDistanceRef.current = Math.sqrt(dx * dx + dy * dy);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isDraggingRef.current) {
      const deltaX = e.touches[0].clientX - previousMousePositionRef.current.x;
      const deltaY = e.touches[0].clientY - previousMousePositionRef.current.y;

      const spherical = cameraSphericalRef.current;
      spherical.theta -= deltaX * 0.008;
      spherical.phi = Math.max(0.05, Math.min(Math.PI - 0.05, spherical.phi - deltaY * 0.008));

      updateCameraPosition();
      previousMousePositionRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else if (e.touches.length === 2 && touchDistanceRef.current !== null) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const deltaDist = touchDistanceRef.current - dist;

      const spherical = cameraSphericalRef.current;
      spherical.radius = Math.max(300, Math.min(2200, spherical.radius + deltaDist * 2.0));
      updateCameraPosition();
      touchDistanceRef.current = dist;
    }
  };

  const handleTouchEnd = () => {
    isDraggingRef.current = false;
    touchDistanceRef.current = null;
  };

  // Camera presets
  const setCameraPreset = (view: 'perspective' | 'front' | 'side' | 'top') => {
    const spherical = cameraSphericalRef.current;
    if (view === 'perspective') {
      spherical.radius = 950;
      spherical.theta = Math.PI / 4;
      spherical.phi = Math.PI / 3;
    } else if (view === 'front') {
      spherical.radius = 900;
      spherical.theta = 0;
      spherical.phi = Math.PI / 2;
    } else if (view === 'side') {
      spherical.radius = 900;
      spherical.theta = Math.PI / 2;
      spherical.phi = Math.PI / 2;
    } else if (view === 'top') {
      spherical.radius = 950;
      spherical.theta = 0;
      spherical.phi = 0.05;
    }
    updateCameraPosition();
  };

  return (
    <div className="relative w-full h-full bg-[#101216] overflow-hidden select-none touch-none">
      {/* 3D Canvas Mount */}
      <div
        ref={mountRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="w-full h-full cursor-grab active:cursor-grabbing"
      />

      {/* Floating View Controls (Top Left) */}
      <div className="absolute top-2.5 left-2.5 flex flex-wrap items-center gap-1 bg-neutral-900/90 p-1 rounded-lg border border-neutral-800 backdrop-blur z-10 shadow-lg text-[11px]">
        <button
          onClick={() => setViewMode('solid')}
          className={`px-2 py-1 rounded font-medium transition ${
            viewMode === 'solid'
              ? 'bg-amber-500 text-black font-semibold'
              : 'text-neutral-300 hover:bg-neutral-800'
          }`}
          title="Widok bryłowy pełny"
        >
          Bryła
        </button>
        <button
          onClick={() => setViewMode('xray')}
          className={`px-2 py-1 rounded font-medium transition ${
            viewMode === 'xray'
              ? 'bg-amber-500 text-black font-semibold'
              : 'text-neutral-300 hover:bg-neutral-800'
          }`}
          title="Widok prześwietlenia (X-Ray) wnętrza"
        >
          X-Ray
        </button>
        <button
          onClick={() => setViewMode('wireframe')}
          className={`px-2 py-1 rounded font-medium transition ${
            viewMode === 'wireframe'
              ? 'bg-amber-500 text-black font-semibold'
              : 'text-neutral-300 hover:bg-neutral-800'
          }`}
          title="Widok krawędziowy (CAD Wireframe)"
        >
          Siatka
        </button>
        <button
          onClick={() => setViewMode('exploded')}
          className={`px-2 py-1 rounded font-medium transition ${
            viewMode === 'exploded'
              ? 'bg-amber-500 text-black font-semibold'
              : 'text-neutral-300 hover:bg-neutral-800'
          }`}
          title="Widok rozstrzelony (Exploded View)"
        >
          Rozstrzelony
        </button>
      </div>

      {/* Exploded Distance Slider */}
      {viewMode === 'exploded' && (
        <div className="absolute top-14 left-2.5 bg-neutral-900/90 p-2 rounded-lg border border-neutral-800 backdrop-blur z-10 flex items-center gap-2">
          <span className="text-[11px] text-neutral-400">Rozsunięcie:</span>
          <input
            type="range"
            min="20"
            max="180"
            value={explodedDistance}
            onChange={(e) => setExplodedDistance(Number(e.target.value))}
            className="w-24 accent-amber-500 cursor-pointer"
          />
          <span className="text-[11px] font-mono text-amber-400 w-10">{explodedDistance}mm</span>
        </div>
      )}

      {/* Camera Orientation Presets & Maximize (Top Right) */}
      <div className="absolute top-2.5 right-2.5 flex items-center gap-1 bg-neutral-900/90 p-1 rounded-lg border border-neutral-800 backdrop-blur z-10 shadow-lg text-[11px]">
        <button
          onClick={() => setCameraPreset('perspective')}
          className="px-2 py-1 text-neutral-300 hover:text-white hover:bg-neutral-800 rounded transition"
          title="Widok perspektywiczny 3D"
        >
          3D
        </button>
        <button
          onClick={() => setCameraPreset('front')}
          className="px-2 py-1 text-neutral-300 hover:text-white hover:bg-neutral-800 rounded transition"
          title="Widok z przodu (Front)"
        >
          Przód
        </button>
        <button
          onClick={() => setCameraPreset('top')}
          className="px-2 py-1 text-neutral-300 hover:text-white hover:bg-neutral-800 rounded transition"
          title="Widok z góry (Top)"
        >
          Góra
        </button>

        {onToggleMaximize && (
          <button
            onClick={onToggleMaximize}
            className="p-1 text-neutral-300 hover:text-amber-400 hover:bg-neutral-800 rounded transition ml-1"
            title={isMaximized ? 'Zmniejsz widok 3D' : 'Powiększ widok 3D na pełny ekran'}
          >
            {isMaximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>

      {/* Collision Warnings Callout Banner */}
      {warnings.length > 0 && (
        <div className="absolute bottom-2.5 left-2.5 right-2.5 max-w-xl mx-auto bg-amber-950/90 border border-amber-500/40 text-amber-200 px-3 py-1.5 rounded-lg backdrop-blur z-10 text-[11px] flex items-start gap-2 shadow-xl">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold text-amber-300">{warnings[0].messagePl}</span>
            <p className="text-neutral-300 leading-snug">{warnings[0].detailPl}</p>
          </div>
        </div>
      )}

      {/* Dimensions Indicator (Bottom Left) */}
      <div className="absolute bottom-2.5 left-2.5 hidden sm:flex items-center gap-2 bg-neutral-900/80 px-2 py-1 rounded border border-neutral-800 text-[10px] font-mono text-neutral-400 backdrop-blur pointer-events-none">
        <span>Zewn: <span className="text-neutral-200">{enclosure.outerWidthMm}×{enclosure.outerHeightMm}×{enclosure.outerDepthMm}</span> mm</span>
        <span className="text-neutral-600">|</span>
        <span>{enclosure.type === 'sealed' ? 'Zamknięta' : (enclosure.type === 'bandpass_4th' ? 'Bandpass 4th' : (enclosure.type === 'bandpass_6th' ? 'Bandpass 6th' : 'Bass-Reflex'))}</span>
      </div>
    </div>
  );
};
