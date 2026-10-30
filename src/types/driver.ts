export interface DriverTSParams {
  fs: number; // Hz (Resonance frequency)
  qes: number; // Electrical Q
  qms: number; // Mechanical Q
  qts: number; // Total Q (qes*qms/(qes+qms))
  vas: number; // Liters (Equivalent volume)
  re: number; // Ohms (DC Resistance)
  le: number; // mH (Voice coil inductance)
  bl: number; // T·m (Motor force factor)
  mms: number; // g (Moving mass)
  cms: number; // mm/N (Mechanical compliance)
  rms: number; // kg/s (Mechanical resistance)
  sd: number; // cm² (Effective piston area)
  xmax: number; // mm (One-way linear excursion)
  xmech?: number; // mm (Mechanical damage limit)
  pe: number; // Watts RMS (Power handling)
  sensitivity: number; // dB @ 1W/1m or 2.83V/1m
  nominalImpedance: number; // Ohms (typically 2, 4, 8)
  voiceCoils: 'single' | 'dual_series' | 'dual_parallel';
}

export interface DriverPhysicalGeometry {
  nominalDiameterInch: number; // 8, 10, 12, 15, 18
  outerDiameterMm: number; // Outer basket flange diameter
  cutoutDiameterMm: number; // Through-hole cutout diameter
  flangeThicknessMm: number; // Rebate / counterbore depth
  mountingDepthMm: number; // Depth behind mounting surface
  magnetDiameterMm: number; // Magnet outer diameter
  displacementLiters: number; // Volume displaced inside enclosure
  mountingType: 'front_surface' | 'flush_rebate' | 'rear_mount';
  boltHoleCircleDiameterMm: number; // PCD for mounting screws
  boltHolesCount: number; // e.g. 8
}

export interface DriverModel {
  id: string;
  brand: string;
  model: string;
  ts: DriverTSParams;
  geometry: DriverPhysicalGeometry;
  notes?: string;
  source: 'factory_spec' | 'klippel_measured' | 'user_custom';
}
