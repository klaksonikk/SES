import { DriverModel } from '../types/driver';
import { VERIFIED_DRIVER_LIBRARY } from './library';

const CUSTOM_DRIVERS_STORAGE_KEY = 'ses_user_custom_drivers';

export function loadCustomDrivers(): DriverModel[] {
  try {
    const raw = localStorage.getItem(CUSTOM_DRIVERS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Błąd odczytu bazy własnych przetworników z localStorage:', err);
  }
  return [];
}

export function saveCustomDriver(driver: DriverModel): DriverModel[] {
  const existing = loadCustomDrivers();
  const index = existing.findIndex(d => d.id === driver.id);
  let updated: DriverModel[];
  if (index >= 0) {
    updated = existing.map((d, i) => i === index ? driver : d);
  } else {
    updated = [driver, ...existing];
  }

  try {
    localStorage.setItem(CUSTOM_DRIVERS_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('Nie udało się zapisać przetwornika w localStorage:', err);
  }
  return updated;
}

export function deleteCustomDriver(driverId: string): DriverModel[] {
  const existing = loadCustomDrivers();
  const updated = existing.filter(d => d.id !== driverId);
  try {
    localStorage.setItem(CUSTOM_DRIVERS_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('Błąd usuwania przetwornika:', err);
  }
  return updated;
}

export function getAllAvailableDrivers(): DriverModel[] {
  const custom = loadCustomDrivers();
  return [...custom, ...VERIFIED_DRIVER_LIBRARY];
}

export function createEmptyCustomDriver(): DriverModel {
  const uniqueId = `custom_driver_${Date.now()}`;
  return {
    id: uniqueId,
    brand: 'Własna Marka',
    model: 'Nowy Subwoofer 12"',
    source: 'user_custom',
    notes: 'Wprowadzony ręcznie przez użytkownika',
    ts: {
      fs: 30.0,
      qes: 0.40,
      qms: 4.5,
      qts: 0.367,
      vas: 50.0,
      re: 3.6,
      le: 1.5,
      bl: 16.0,
      mms: 180.0,
      cms: 0.16,
      rms: 7.5,
      sd: 500.0,
      xmax: 15.0,
      xmech: 25.0,
      pe: 500,
      sensitivity: 87.0,
      nominalImpedance: 4,
      voiceCoils: 'single'
    },
    geometry: {
      nominalDiameterInch: 12,
      outerDiameterMm: 318,
      cutoutDiameterMm: 282,
      flangeThicknessMm: 12,
      mountingDepthMm: 160,
      magnetDiameterMm: 170,
      displacementLiters: 3.5,
      mountingType: 'flush_rebate',
      boltHoleCircleDiameterMm: 298,
      boltHolesCount: 8
    }
  };
}
