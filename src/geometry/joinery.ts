import { EnclosureConfig } from '../types/enclosure';
import { Panel3D, CutListItem, PanelCutout } from '../types/cad';
import { DriverModel } from '../types/driver';

export interface SolvedGeometry {
  panels: Panel3D[];
  cutList: CutListItem[];
  internalDimensionsMm: {
    widthMm: number;
    heightMm: number;
    depthMm: number;
  };
  totalWoodVolumeLiters: number;
  totalWoodWeightKg: number;
}

/**
 * Rozwiązuje geometrię paneli i połączeń stolarskich zgodnie z wybranym stylem połączeń (JoineryStyle).
 * Obsługuje obudowy Sealed, Bass-Reflex Slot, Bass-Reflex Tube (Rura) oraz Bandpass 4th & 6th order.
 */
export function solveEnclosureGeometry(
  enclosure: EnclosureConfig,
  driver: DriverModel,
  materialDensityKgM3: number = 750 // MDF ~750, Sklejka ~680
): SolvedGeometry {
  const t = enclosure.panelThicknessMm;
  const W = enclosure.outerWidthMm;
  const H = enclosure.outerHeightMm;
  const D = enclosure.outerDepthMm;
  const hasDoubleFront = enclosure.hasDoubleBaffle;
  const tDouble = enclosure.doubleBaffleThicknessMm || t;

  const isBandpass = enclosure.type === 'bandpass_4th' || enclosure.type === 'bandpass_6th';
  const is6th = enclosure.type === 'bandpass_6th';
  const isTube = enclosure.type === 'bass_reflex_tube' || enclosure.port.type === 'round' || enclosure.port.type === 'aeroport';
  const isSlot = (enclosure.type === 'bass_reflex_slot' || enclosure.type === 'bass_reflex') && !isTube;

  let topW: number, topL: number;
  let botW: number, botL: number;
  let frontW: number, frontH: number;
  let backW: number, backH: number;
  let sideW: number, sideH: number;
  let intW: number, intH: number, intD: number;

  if (enclosure.joinery === 'standard_top_bottom_overlay') {
    // Sekcja 8 Master Promptu: Góra i Dół obejmują całość (W x D)
    topW = W;
    topL = D;
    botW = W;
    botL = D;

    intH = H - 2 * t;
    frontW = W;
    frontH = intH;
    backW = W;
    backH = intH;

    const frontEffectiveT = hasDoubleFront ? t + tDouble : t;
    sideW = D - (t + frontEffectiveT);
    sideH = intH;

    intW = W - 2 * t;
    intD = sideW;
  } else if (enclosure.joinery === 'sides_overlay') {
    // Boki obejmują całość wysokości i głębokości (H x D)
    sideW = D;
    sideH = H;
    intW = W - 2 * t;
    topW = intW;
    topL = D;
    botW = intW;
    botL = D;
    intH = H - 2 * t;
    const frontEffectiveT = hasDoubleFront ? t + tDouble : t;
    intD = D - (t + frontEffectiveT);
    frontW = intW;
    frontH = intH;
    backW = intW;
    backH = intH;
  } else {
    // Flush front inset
    topW = W;
    topL = D;
    botW = W;
    botL = D;
    intH = H - 2 * t;
    sideW = D;
    sideH = intH;
    intW = W - 2 * t;
    intD = D - 2 * t - (hasDoubleFront ? tDouble : 0);
    frontW = intW;
    frontH = intH;
    backW = W;
    backH = intH;
  }

  const panels: Panel3D[] = [];

  // 1. Płyta Dolna (Bottom)
  panels.push({
    id: 'panel_bottom',
    namePl: 'Płyta dolna (Bottom)',
    widthMm: botW,
    heightMm: botL,
    thicknessMm: t,
    positionMm: [0, -H / 2 + t / 2, 0],
    rotationRad: [-Math.PI / 2, 0, 0],
    colorHex: '#8b5a2b',
    cutouts: [],
    visible: true
  });

  // 2. Płyta Górna (Top)
  panels.push({
    id: 'panel_top',
    namePl: 'Płyta górna (Top)',
    widthMm: topW,
    heightMm: topL,
    thicknessMm: t,
    positionMm: [0, H / 2 - t / 2, 0],
    rotationRad: [-Math.PI / 2, 0, 0],
    colorHex: '#9c6633',
    cutouts: [],
    visible: true
  });

  // 3. Płyta Tylna (Back)
  const backCutouts: PanelCutout[] = [
    {
      id: 'terminal_hole_1',
      type: 'terminal_hole',
      xMm: 0,
      yMm: -backH / 4,
      diameterMm: 78
    }
  ];

  if (is6th) {
    // Komora tylna w 6th order ma dodatkowy wylot portu
    backCutouts.push({
      id: 'rear_port_tube',
      type: 'port_opening',
      xMm: 0,
      yMm: backH / 4,
      diameterMm: enclosure.bandpass?.rearPortDiameterMm || 100
    });
  }

  panels.push({
    id: 'panel_back',
    namePl: 'Płyta tylna (Back)',
    widthMm: backW,
    heightMm: backH,
    thicknessMm: t,
    positionMm: [0, 0, -D / 2 + t / 2],
    rotationRad: [0, 0, 0],
    colorHex: '#73461e',
    cutouts: backCutouts,
    visible: true
  });

  // Wycięcia pod głośnik
  const driverCutouts: PanelCutout[] = [];
  const driverSpacing = frontW / (enclosure.driverCount + 1);
  const userOffX = enclosure.driverOffsetXOffsetMm || 0;
  const userOffY = enclosure.driverOffsetYOffsetMm || 0;

  for (let d = 0; d < enclosure.driverCount; d++) {
    const baseX = -frontW / 2 + driverSpacing * (d + 1);
    const baseY = isBandpass ? 0 : (isTube ? -frontH / 8 : 0);
    const xPos = baseX + userOffX;
    const yPos = baseY + userOffY;

    driverCutouts.push({
      id: `driver_through_${d}`,
      type: 'driver_through',
      xMm: Math.round(xPos),
      yMm: Math.round(yPos),
      diameterMm: driver.geometry.cutoutDiameterMm
    });

    if (driver.geometry.mountingType === 'flush_rebate') {
      driverCutouts.push({
        id: `driver_rebate_${d}`,
        type: 'driver_rebate',
        xMm: Math.round(xPos),
        yMm: Math.round(yPos),
        diameterMm: driver.geometry.outerDiameterMm,
        depthMm: driver.geometry.flangeThicknessMm
      });
    }
  }

  // Wycięcia pod porty w przedniej ściance
  const frontCutouts: PanelCutout[] = [];

  if (isBandpass) {
    // W Bandpass na froncie NIE ma głośnika, lecz wylot portu komory przedniej!
    if (isTube || enclosure.port.type === 'round' || enclosure.port.type === 'aeroport') {
      const count = enclosure.port.tubeCount || 1;
      const dia = enclosure.port.diameterMm || 100;
      if (count === 1) {
        frontCutouts.push({
          id: 'front_tube_port_0',
          type: 'port_opening',
          xMm: 0,
          yMm: 0,
          diameterMm: dia
        });
      } else {
        frontCutouts.push(
          { id: 'front_tube_port_0', type: 'port_opening', xMm: -dia * 0.8, yMm: 0, diameterMm: dia },
          { id: 'front_tube_port_1', type: 'port_opening', xMm: dia * 0.8, yMm: 0, diameterMm: dia }
        );
      }
    } else {
      // Slot port na froncie bandpass
      frontCutouts.push({
        id: 'front_slot_port',
        type: 'port_opening',
        xMm: 0,
        yMm: -frontH / 2 + (enclosure.port.slotHeightMm || 60) / 2 + 10,
        widthMm: enclosure.port.slotWidthMm || 120,
        heightMm: enclosure.port.slotHeightMm || 60
      });
    }
  } else {
    // W obudowie zwykłej front ma głośnik(i)
    frontCutouts.push(...driverCutouts);

    // I ewentualny port rurkowy na froncie
    if (isTube) {
      const count = enclosure.port.tubeCount || 1;
      const dia = enclosure.port.diameterMm || 100;
      const portY = frontH / 3; // na górze nad głośnikiem
      if (count === 1) {
        frontCutouts.push({
          id: 'front_tube_port_0',
          type: 'port_opening',
          xMm: 0,
          yMm: portY,
          diameterMm: dia
        });
      } else {
        frontCutouts.push(
          { id: 'front_tube_port_0', type: 'port_opening', xMm: -frontW / 4, yMm: portY, diameterMm: dia },
          { id: 'front_tube_port_1', type: 'port_opening', xMm: frontW / 4, yMm: portY, diameterMm: dia }
        );
      }
    }

    // Szczelina musi być wycięta w przedniej płycie, tak jak otwór pod rurę.
    if (isSlot) {
      const portWidth = Math.max(0, enclosure.port.slotWidthMm);
      const portHeight = Math.max(0, enclosure.port.slotHeightMm || intH);
      const isBottomPort = enclosure.port.portLocation === 'front_bottom';
      const isLeftPort = enclosure.port.portLocation === 'front_left';
      const xMm = isBottomPort
        ? 0
        : (isLeftPort ? -1 : 1) * (frontW / 2 - t - portWidth / 2);
      const yMm = isBottomPort
        ? -frontH / 2 + t + portHeight / 2
        : 0;
      frontCutouts.push({
        id: 'front_slot_port',
        type: 'port_opening',
        xMm,
        yMm,
        widthMm: portWidth,
        heightMm: portHeight
      });
    }
  }

  // 4. Płyta Przednia (Front Baffle)
  const frontZ = D / 2 - t / 2;
  panels.push({
    id: 'panel_front',
    namePl: isBandpass 
      ? 'Front z portem komory przedniej (Front)' 
      : (hasDoubleFront ? 'Front wewnętrzny (Baffle inner)' : 'Płyta przednia (Front Baffle)'),
    widthMm: frontW,
    heightMm: frontH,
    thicknessMm: t,
    positionMm: [0, 0, hasDoubleFront ? frontZ - tDouble : frontZ],
    rotationRad: [0, 0, 0],
    colorHex: '#a06a38',
    cutouts: frontCutouts,
    visible: true
  });

  // 4b. Podwójny front (Double Baffle)
  if (hasDoubleFront && !isBandpass) {
    panels.push({
      id: 'panel_front_double',
      namePl: 'Front zewnętrzny podwójny (Baffle outer)',
      widthMm: frontW,
      heightMm: frontH,
      thicknessMm: tDouble,
      positionMm: [0, 0, frontZ],
      rotationRad: [0, 0, 0],
      colorHex: '#b27842',
      cutouts: frontCutouts,
      visible: true
    });
  }

  // 4c. Przegroda Wewnętrzna Komór w Bandpass (Internal Divider Baffle)
  if (isBandpass) {
    const ratio = enclosure.bandpass?.frontChamberRatio ?? 0.40;
    // Z = 0 jest na środku głębokości intD.
    // Przód to +intD/2, tył to -intD/2.
    // Komora przednia o długości intD * ratio zaczyna się od frontu (+intD/2) w głąb:
    const baffleZ = (intD / 2) - (intD * ratio);

    panels.push({
      id: 'panel_internal_baffle',
      namePl: 'Przegroda wewnętrzna komór (Bandpass Divider)',
      widthMm: intW,
      heightMm: intH,
      thicknessMm: t,
      positionMm: [0, 0, baffleZ],
      rotationRad: [0, 0, 0],
      colorHex: '#60a5fa', // wyraźny odcień dla przegrody montażowej
      isBracing: true,
      cutouts: driverCutouts, // głośnik zamontowany wewnątrz w przegrodzie!
      visible: true
    });
  }

  // 5. Płyta Lewa (Left Side)
  panels.push({
    id: 'panel_left',
    namePl: 'Płyta lewa (Left Side)',
    widthMm: sideW,
    heightMm: sideH,
    thicknessMm: t,
    positionMm: [-W / 2 + t / 2, 0, 0],
    rotationRad: [0, Math.PI / 2, 0],
    colorHex: '#7a4b22',
    cutouts: [],
    visible: true
  });

  // 6. Płyta Prawa (Right Side)
  panels.push({
    id: 'panel_right',
    namePl: 'Płyta prawa (Right Side)',
    widthMm: sideW,
    heightMm: sideH,
    thicknessMm: t,
    positionMm: [W / 2 - t / 2, 0, 0],
    rotationRad: [0, Math.PI / 2, 0],
    colorHex: '#7a4b22',
    cutouts: [],
    visible: true
  });

  // 7. Panele Portu Szczelinowego (Slot Port)
  if (isSlot) {
    const portW = Math.max(0, enclosure.port.slotWidthMm);
    const portH = Math.max(0, enclosure.port.slotHeightMm || intH);
    const portT = Math.max(1, enclosure.port.wallThicknessMm || t);
    const isLBend = enclosure.port.type === 'slot_l_bend';
    const isBottomPort = enclosure.port.portLocation === 'front_bottom';
    const frontInsideZ = D / 2 - (hasDoubleFront ? t + tDouble : t);
    const backInsideZ = -D / 2 + t;
    const side = enclosure.port.portLocation === 'front_left' ? -1 : 1;
    const portLength = Math.max(20, enclosure.port.lengthMm);

    if (isBottomPort) {
      // Bottom slot: its ceiling forms the upper boundary; the cabinet floor
      // forms the lower boundary. The drawing keeps the user-entered section.
      const run = Math.min(portLength, intD);
      panels.push({
        id: 'panel_port_wall_1',
        namePl: 'Sufit tunelu portu szczelinowego',
        widthMm: portW,
        heightMm: run,
        thicknessMm: portT,
        positionMm: [0, -H / 2 + t + portH + portT / 2, frontInsideZ - run / 2],
        rotationRad: [-Math.PI / 2, 0, 0],
        colorHex: '#523418',
        isPortPanel: true,
        cutouts: [],
        visible: true
      });
    } else {
      // Front slot along one side. The first septum runs toward the rear;
      // an L port turns across the back when its length exceeds that run.
      const firstLegLimit = Math.max(20, intD - portW);
      const firstLegLength = Math.min(portLength, firstLegLimit);
      const sideInnerX = side * (W / 2 - t);
      const firstWallX = sideInnerX - side * (portW + portT / 2);

      panels.push({
        id: 'panel_port_wall_1',
        namePl: 'Ścianka tunelu portu (odc. 1)',
        widthMm: firstLegLength,
        heightMm: portH,
        thicknessMm: portT,
        positionMm: [firstWallX, 0, frontInsideZ - firstLegLength / 2],
        rotationRad: [0, Math.PI / 2, 0],
        colorHex: '#523418',
        isPortPanel: true,
        cutouts: [],
        visible: true
      });

      const secondLegLength = portLength - firstLegLength;
      if (isLBend && secondLegLength > 1) {
        const maxSecondLeg = Math.max(0, intW - portW - portT);
        const renderedSecondLeg = Math.min(secondLegLength, maxSecondLeg);
        const secondStartX = sideInnerX - side * (portW + portT);
        panels.push({
          id: 'panel_port_wall_2',
          namePl: 'Ścianka tunelu portu (odc. 2, zagięcie)',
          widthMm: renderedSecondLeg,
          heightMm: portH,
          thicknessMm: portT,
          positionMm: [
            secondStartX - side * renderedSecondLeg / 2,
            0,
            backInsideZ + portW + portT / 2
          ],
          rotationRad: [0, 0, 0],
          colorHex: '#523418',
          isPortPanel: true,
          cutouts: [],
          visible: true
        });
      }
    }
  }

  // Generowanie Listy Cięcia (Cut List)
  const cutList: CutListItem[] = [];
  const materialLabel = enclosure.material === 'baltic_birch' ? 'Sklejka Bałtycka' : 'MDF surowy';

  cutList.push({
    id: 'cut_top_bot',
    panelName: 'Góra i Dół (Top & Bottom)',
    widthMm: topW,
    lengthMm: topL,
    thicknessMm: t,
    quantity: 2,
    material: materialLabel,
    notes: 'Pełne nakrycie korpusu (W_ext x D_ext)'
  });

  cutList.push({
    id: 'cut_front_back',
    panelName: hasDoubleFront && !isBandpass ? 'Front wewn. i Tył' : 'Front i Tył',
    widthMm: frontW,
    lengthMm: frontH,
    thicknessMm: t,
    quantity: 2,
    material: materialLabel,
    notes: isBandpass ? 'Front z wycięciem na port, tył na terminal' : 'Wymaga wycięć pod głośnik i terminal'
  });

  if (hasDoubleFront && !isBandpass) {
    cutList.push({
      id: 'cut_front_double',
      panelName: 'Front zewnętrzny podwójny (Baffle outer)',
      widthMm: frontW,
      lengthMm: frontH,
      thicknessMm: tDouble,
      quantity: 1,
      material: materialLabel,
      notes: 'Płyta podwójna z podfrezowaniem'
    });
  }

  cutList.push({
    id: 'cut_sides',
    panelName: 'Boki lewy i prawy (Sides)',
    widthMm: sideW,
    lengthMm: sideH,
    thicknessMm: t,
    quantity: 2,
    material: materialLabel,
    notes: 'Wpuszczane w korpus'
  });

  // Dodanie przegrody Bandpass do listy cięcia
  if (isBandpass) {
    cutList.push({
      id: 'cut_bandpass_divider',
      panelName: 'Przegroda wewnętrzna komór (Bandpass Divider)',
      widthMm: intW,
      lengthMm: intH,
      thicknessMm: t,
      quantity: 1,
      material: materialLabel,
      notes: 'Główna przegroda montażowa głośnika wewnątrz skrzynki'
    });
  }

  // Dodanie paneli portu szczelinowego do listy cięcia
  panels.filter(p => p.isPortPanel).forEach(p => {
    cutList.push({
      id: `cut_${p.id}`,
      panelName: p.namePl,
      widthMm: p.widthMm,
      lengthMm: p.heightMm,
      thicknessMm: p.thicknessMm,
      quantity: 1,
      material: materialLabel,
      notes: 'Wewnętrzny tunel rezonansowy'
    });
  });

  let totalWoodM3 = 0;
  cutList.forEach(item => {
    const vol = (item.widthMm * 1e-3) * (item.lengthMm * 1e-3) * (item.thicknessMm * 1e-3) * item.quantity;
    totalWoodM3 += vol;
  });

  const totalWoodWeightKg = totalWoodM3 * materialDensityKgM3;

  return {
    panels,
    cutList,
    internalDimensionsMm: {
      widthMm: Math.round(intW),
      heightMm: Math.round(intH),
      depthMm: Math.round(intD)
    },
    totalWoodVolumeLiters: Number((totalWoodM3 * 1000).toFixed(2)),
    totalWoodWeightKg: Number(totalWoodWeightKg.toFixed(2))
  };
}
