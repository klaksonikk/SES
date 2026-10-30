export interface AcousticPoint {
  freqHz: number;
  splDb: number; // dB SPL @ 1m with Pin
  splNormalizedDb: number; // dB transfer function relative to passband
  impedanceMagOhm: number; // |Z(f)|
  impedancePhaseDeg: number; // Angle(Z)
  excursionMm: number; // Cone excursion peak
  portAirVelocityMs: number; // Port velocity in m/s
  groupDelayMs: number; // Group delay in ms
}

export interface AcousticSimulationResult {
  f3Hz: number; // -3dB cutoff frequency
  f6Hz: number; // -6dB cutoff frequency
  f10Hz: number; // -10dB cutoff frequency
  qtc?: number; // for sealed
  tuningFbHz: number; // for bass reflex
  maxSplDb: number; // Max SPL within Xmax and Pe limits
  maxAirVelocityMs: number; // Peak port velocity at rated power
  isAirVelocityDangerous: boolean; // > 17 m/s (chuffing risk)
  isExcursionExceeded: boolean; // excursion > Xmax
  curve: AcousticPoint[];
}

export interface AlignmentPreset {
  name: string;
  descriptionPl: string;
  recommendedVbLiters: number;
  recommendedFbHz: number;
  type: 'QB3' | 'BB4' | 'SC4' | 'C4' | 'EBS' | 'Butterworth' | 'Bessel' | 'Chebyshev_Sealed';
  category: 'bass_reflex' | 'sealed';
  badge?: string; // np. 'SPL / Punch', 'Płaska Studyjna', 'Audiofilski Impuls', 'Maksymalne Zejście'
}

