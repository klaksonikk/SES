import { EnclosureConfig } from '../types/enclosure';
import { DriverModel } from '../types/driver';
import { VERIFIED_DRIVER_LIBRARY } from '../drivers/library';

export interface ProjectData {
  schemaVersion: '1.0.0';
  name: string;
  author: string;
  dateModified: string;
  enclosure: EnclosureConfig;
  driver: DriverModel;
  notes?: string;
}

export const DEFAULT_PROJECT: ProjectData = {
  schemaVersion: '1.0.0',
  name: 'Dayton RSS315HO 50L Bass-Reflex 32Hz',
  author: 'Inżynier Akustyk',
  dateModified: new Date().toISOString(),
  driver: VERIFIED_DRIVER_LIBRARY[0], // Dayton Audio RSS315HO-4
  enclosure: {
    type: 'bass_reflex',
    joinery: 'standard_top_bottom_overlay', // Reguła Sekcji 8
    material: 'mdf',
    panelThicknessMm: 19,
    hasDoubleBaffle: true, // podwójny front 19+19mm
    doubleBaffleThicknessMm: 19,
    outerWidthMm: 520,
    outerHeightMm: 420,
    outerDepthMm: 430,
    driverCount: 1,
    driverArrangement: 'standard',
    driverMountFacing: 'outward',
    port: {
      type: 'slot_l_bend',
      diameterMm: 100,
      tubeCount: 1,
      hasFlare: true,
      slotWidthMm: 36,
      slotHeightMm: 382, // pełna wewnętrzna wysokość
      lengthMm: 680,
      effectiveLengthMm: 740,
      targetFbHz: 32,
      autoCalculateLength: true,
      wallThicknessMm: 19,
      portLocation: 'front_right',
      hasCornerReflector: true,
      flangeType: 'one_flanged'
    },
    bandpass: {
      frontChamberRatio: 0.40,
      rearFbHz: 30,
      rearPortDiameterMm: 100
    },
    bracing: {
      type: 'shelf_window',
      thicknessMm: 19,
      displacementLiters: 1.8,
      count: 1
    },
    dampingAbsorptionFactor: 1.08,
    terminalDisplacementLiters: 0.15
  },
  notes: 'Klasyczny projekt subwoofera aktywnego z portem szczelinowym zagiętym wzdłuż tylnej ścianki.'
};

const STORAGE_KEY = 'subwoofer_studio_active_project';

export function saveProjectToStorage(project: ProjectData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
  } catch (err) {
    console.warn('Nie udało się zapisać projektu w localStorage:', err);
  }
}

export function loadProjectFromStorage(): ProjectData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const result = importProjectFromJson(raw);
      if (result.success && result.data) return result.data;
    }
  } catch (err) {
    console.warn('Błąd odczytu projektu z localStorage, używam domyślnego:', err);
  }
  return DEFAULT_PROJECT;
}

export function exportProjectToJson(project: ProjectData): string {
  return JSON.stringify({ ...project, dateModified: new Date().toISOString() }, null, 2);
}

export function importProjectFromJson(jsonString: string): { success: boolean; data?: ProjectData; error?: string } {
  try {
    const parsed = JSON.parse(jsonString);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { success: false, error: 'Nieprawidłowy format JSON.' };
    }
    if (!parsed.enclosure || !parsed.driver) {
      return { success: false, error: 'Plik nie zawiera wymaganych sekcji enclosure i driver.' };
    }

    const enclosure = {
      ...DEFAULT_PROJECT.enclosure,
      ...parsed.enclosure,
      port: { ...DEFAULT_PROJECT.enclosure.port, ...(parsed.enclosure.port || {}) },
      bracing: { ...DEFAULT_PROJECT.enclosure.bracing, ...(parsed.enclosure.bracing || {}) },
      bandpass: parsed.enclosure.bandpass
        ? { ...DEFAULT_PROJECT.enclosure.bandpass, ...parsed.enclosure.bandpass }
        : DEFAULT_PROJECT.enclosure.bandpass
    } as EnclosureConfig;
    const driver: DriverModel = {
      ...DEFAULT_PROJECT.driver,
      ...parsed.driver,
      ts: { ...DEFAULT_PROJECT.driver.ts, ...(parsed.driver.ts || {}) },
      geometry: { ...DEFAULT_PROJECT.driver.geometry, ...(parsed.driver.geometry || {}) }
    };

    const allowedEnclosureTypes = [
      'sealed', 'bass_reflex', 'bass_reflex_slot', 'bass_reflex_tube',
      'bandpass_4th', 'bandpass_6th', 'passive_radiator'
    ];
    const allowedPortTypes = ['round', 'aeroport', 'slot', 'slot_l_bend'];
    const positive = (value: unknown) => typeof value === 'number' && Number.isFinite(value) && value > 0;
    const nonNegative = (value: unknown) => typeof value === 'number' && Number.isFinite(value) && value >= 0;

    if (!allowedEnclosureTypes.includes(enclosure.type)) {
      return { success: false, error: 'Nieznany typ obudowy w pliku projektu.' };
    }
    if (!allowedPortTypes.includes(enclosure.port.type)) {
      return { success: false, error: 'Nieznany typ portu w pliku projektu.' };
    }
    if (![enclosure.outerWidthMm, enclosure.outerHeightMm, enclosure.outerDepthMm, enclosure.panelThicknessMm].every(positive)) {
      return { success: false, error: 'Wymiary obudowy i grubość materiału muszą być dodatnimi liczbami.' };
    }
    if (!positive(enclosure.port.targetFbHz) || !nonNegative(enclosure.port.lengthMm) ||
        !positive(enclosure.port.slotWidthMm) || !positive(enclosure.port.slotHeightMm) ||
        !positive(enclosure.port.diameterMm)) {
      return { success: false, error: 'Parametry portu zawierają nieprawidłowe wymiary lub strojenie.' };
    }
    if (![1, 2, 4].includes(enclosure.driverCount)) {
      return { success: false, error: 'Liczba przetworników musi wynosić 1, 2 albo 4.' };
    }
    if (![driver.ts.fs, driver.ts.qes, driver.ts.qms, driver.ts.qts, driver.ts.vas,
      driver.ts.re, driver.ts.bl, driver.ts.mms, driver.ts.cms, driver.ts.sd,
      driver.ts.xmax, driver.ts.pe, driver.ts.nominalImpedance].every(positive) ||
      !Number.isFinite(driver.ts.le) || !Number.isFinite(driver.ts.rms) ||
      !positive(driver.geometry.outerDiameterMm) || !positive(driver.geometry.cutoutDiameterMm) ||
      !positive(driver.geometry.mountingDepthMm) || !nonNegative(driver.geometry.displacementLiters)) {
      return { success: false, error: 'Parametry przetwornika w pliku są niekompletne lub nieprawidłowe.' };
    }

    return {
      success: true,
      data: {
        ...DEFAULT_PROJECT,
        ...parsed,
        enclosure,
        driver,
        schemaVersion: '1.0.0',
        dateModified: typeof parsed.dateModified === 'string' ? parsed.dateModified : new Date().toISOString()
      }
    };
  } catch (err: any) {
    return { success: false, error: `Błąd parsowania pliku JSON: ${err.message}` };
  }
}
