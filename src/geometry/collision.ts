import { EnclosureConfig } from '../types/enclosure';
import { DriverModel } from '../types/driver';
import { SolvedGeometry } from './joinery';
import { CollisionWarning } from '../types/cad';

/**
 * Kontroler kolizji geometrycznych i ograniczeń montażowych (Section 8, 9, 10)
 */
export function detectGeometricCollisions(
  enclosure: EnclosureConfig,
  driver: DriverModel,
  solved: SolvedGeometry
): CollisionWarning[] {
  const warnings: CollisionWarning[] = [];
  const { internalDimensionsMm, panels } = solved;
  const geom = driver.geometry;
  const isBandpass = enclosure.type === 'bandpass_4th' || enclosure.type === 'bandpass_6th';
  const isVented = enclosure.type === 'bass_reflex' || enclosure.type === 'bass_reflex_slot' ||
    enclosure.type === 'bass_reflex_tube' || isBandpass;
  const isSlot = isVented && enclosure.port.type !== 'round' && enclosure.port.type !== 'aeroport';

  // 1. Sprawdzenie głębokości montażowej przetwornika vs głębokość wewnętrzna
  const availableDepth = internalDimensionsMm.depthMm;
  const driverDepth = geom.mountingDepthMm;
  const poleVentClearance = availableDepth - driverDepth;

  if (poleVentClearance < 0) {
    warnings.push({
      severity: 'error',
      code: 'MAGNET_PENETRATES_BACK_WALL',
      messagePl: 'KOLIZJA: Magnes głośnika przebija tylną ściankę obudowy!',
      detailPl: `Głębokość głośnika (${driverDepth} mm) przekracza głębokość wewnętrzną skrzynki (${availableDepth} mm) o ${Math.abs(poleVentClearance)} mm.`
    });
  } else if (poleVentClearance < 25) {
    warnings.push({
      severity: 'warning',
      code: 'POLE_VENT_RESTRICTED',
      messagePl: 'Ostrzeżenie: Otwór wentylacyjny magnesu ma za mały prześwit',
      detailPl: `Pozostało jedynie ${poleVentClearance} mm do tylnej ścianki. Dla prawidłowego chłodzenia cewki zaleca się min. 25-35 mm wolnej przestrzeni.`
    });
  }

  // 2. Margines krawędziowy wycięcia na froncie (Baffle edge margin)
  const frontPanel = panels.find(p => p.id === 'panel_front');
  if (frontPanel) {
    const cutoutRadius = geom.cutoutDiameterMm / 2;
    const outerFlangeRadius = geom.outerDiameterMm / 2;
    
    // Sprawdzenie czy kosz mieści się na wysokość i szerokość frontu z uwzględnieniem przesunięcia
    const driverCutouts = frontPanel.cutouts.filter(cutout => cutout.type === 'driver_through');
    const minMargin = driverCutouts.length === 0
      ? Infinity
      : Math.min(...driverCutouts.flatMap(cutout => [
          frontPanel.heightMm / 2 - (cutout.yMm + outerFlangeRadius),
          frontPanel.heightMm / 2 - (-cutout.yMm + outerFlangeRadius),
          frontPanel.widthMm / 2 - (cutout.xMm + outerFlangeRadius),
          frontPanel.widthMm / 2 - (-cutout.xMm + outerFlangeRadius)
        ]));

    if (minMargin < 0) {
      warnings.push({
        severity: 'error',
        code: 'DRIVER_EXCEEDS_BAFFLE_EDGE',
        messagePl: 'KOLIZJA: Kołnierz głośnika wystaje poza krawędź płyty!',
        detailPl: `Kołnierz wystaje poza płytę o ${Math.abs(minMargin).toFixed(1)} mm.`
      });
    } else if (minMargin < 15) {
      warnings.push({
        severity: 'warning',
        code: 'MINIMAL_EDGE_MARGIN',
        messagePl: 'Wąski margines do krawędzi płyty',
        detailPl: `Margines do krawędzi ścianki wynosi tylko ${minMargin.toFixed(1)} mm. Ryzyko osłabienia mocowania wkrętów.`
      });
    }

    // Sprawdzenie czy przetworniki nie nachodzą na siebie
    if (enclosure.driverCount > 1) {
      for (let i = 0; i < driverCutouts.length; i++) {
        for (let j = i + 1; j < driverCutouts.length; j++) {
          const dx = driverCutouts[i].xMm - driverCutouts[j].xMm;
          const dy = driverCutouts[i].yMm - driverCutouts[j].yMm;
          const centerDist = Math.hypot(dx, dy);
          if (centerDist < geom.outerDiameterMm + 10) {
            warnings.push({
              severity: 'error',
              code: 'DRIVERS_COLLIDE',
              messagePl: 'KOLIZJA: Kosze głośników nachodzą na siebie!',
              detailPl: `Rozstaw osi przetworników (${centerDist.toFixed(1)} mm) jest mniejszy niż średnica zewnętrzna kosza (${geom.outerDiameterMm} mm).`
            });
            i = driverCutouts.length;
            break;
          }
        }
      }
    }

    // 3. Kolizja z tunelem portu szczelinowego
    if (isVented && isSlot && !isBandpass) {
      const portWidth = enclosure.port.slotWidthMm;
      const portHeight = enclosure.port.slotHeightMm || internalDimensionsMm.heightMm;
      const portOpening = frontPanel.cutouts.find(cutout => cutout.id === 'front_slot_port');
      const wallThickness = enclosure.port.wallThicknessMm || enclosure.panelThicknessMm;

      if (portOpening) {
        const halfW = (portOpening.widthMm || portWidth) / 2;
        const halfH = (portOpening.heightMm || portHeight) / 2;
        const openingInsideBaffle =
          portOpening.xMm - halfW >= -frontPanel.widthMm / 2 &&
          portOpening.xMm + halfW <= frontPanel.widthMm / 2 &&
          portOpening.yMm - halfH >= -frontPanel.heightMm / 2 &&
          portOpening.yMm + halfH <= frontPanel.heightMm / 2;
        if (!openingInsideBaffle) {
          warnings.push({
            severity: 'error',
            code: 'PORT_OPENING_OUTSIDE_BAFFLE',
            messagePl: 'Otwór portu szczelinowego nie mieści się w przedniej płycie.',
            detailPl: 'Zmniejsz wymiary otworu albo zwiększ przednią płytę.'
          });
        }
        const overlapsDriver = driverCutouts.some(cutout => {
          const closestX = Math.max(portOpening.xMm - halfW, Math.min(cutout.xMm, portOpening.xMm + halfW));
          const closestY = Math.max(portOpening.yMm - halfH, Math.min(cutout.yMm, portOpening.yMm + halfH));
          return Math.hypot(cutout.xMm - closestX, cutout.yMm - closestY) < geom.outerDiameterMm / 2 + 10;
        });
        if (overlapsDriver) {
          warnings.push({
            severity: 'error',
            code: 'PORT_OVERLAPS_DRIVER',
            messagePl: 'KOLIZJA: Wylot portu nachodzi na głośnik.',
            detailPl: 'Przesuń port albo zmień jego szerokość i położenie.'
          });
        }
      }

      const firstLegLimit = Math.max(0, internalDimensionsMm.depthMm - portWidth);
      const secondLegLimit = Math.max(0, internalDimensionsMm.widthMm - portWidth - wallThickness);
      const maxLength = enclosure.port.portLocation === 'front_bottom'
        ? internalDimensionsMm.depthMm
        : (enclosure.port.type === 'slot_l_bend' ? firstLegLimit + secondLegLimit : firstLegLimit);

      if (enclosure.port.lengthMm > maxLength) {
        warnings.push({
          severity: 'error',
          code: 'PORT_LENGTH_EXCEEDS_BOX',
          messagePl: 'Port szczelinowy jest dłuższy niż miejsce wewnątrz obudowy.',
          detailPl: `Port ma ${enclosure.port.lengthMm.toFixed(0)} mm, a dostępna trasa mieści maksymalnie ${maxLength.toFixed(0)} mm.`
        });
      }

      const portEndClearance = internalDimensionsMm.depthMm - enclosure.port.lengthMm;
      if (enclosure.port.type === 'slot' && portEndClearance < portWidth) {
        warnings.push({
          severity: 'warning',
          code: 'PORT_MOUTH_CHOKED',
          messagePl: 'Wlot tunelu portu zadławiony przez ściankę tylną!',
          detailPl: `Prześwit między końcem portu a tylną ścianką (${portEndClearance.toFixed(0)} mm) jest mniejszy niż szerokość szczeliny (${portWidth} mm). Wymaga zagięcia typu L.`
        });
      }
    }
  }

  return warnings;
}
