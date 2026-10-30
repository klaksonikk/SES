export type EnclosureType = 
  | 'sealed' 
  | 'bass_reflex' 
  | 'bass_reflex_slot' 
  | 'bass_reflex_tube' 
  | 'bandpass_4th' 
  | 'bandpass_6th' 
  | 'passive_radiator';

export type JoineryStyle = 
  | 'standard_top_bottom_overlay' // Reguła sekcji 8: Góra i dół obejmują całość (W x D)
  | 'sides_overlay'               // Boki obejmują górę i dół
  | 'flush_front_inset';          // Front wpuszczany wewnątrz korpusu

export type PortType = 'round' | 'aeroport' | 'slot' | 'slot_l_bend';

export type MaterialType = 'mdf' | 'baltic_birch' | 'plywood' | 'hsb';

export interface MaterialProps {
  id: MaterialType;
  name: string;
  densityKgM3: number; // np. MDF ~750 kg/m³, Baltic Birch ~680 kg/m³
  defaultThicknessMm: number;
}

export interface PortConfig {
  type: PortType;
  diameterMm: number; // dla portu okrągłego / tubowego [mm]
  tubeCount?: number; // liczba rur: 1 lub 2
  hasFlare?: boolean; // zaokrąglenie wlotu/wylotu (aeroport)
  slotWidthMm: number; // szerokość szczeliny portu (np. 40mm)
  slotHeightMm: number; // wysokość szczeliny (często równa wewnętrznej wysokości obudowy)
  lengthMm: number; // rzeczywista długość fizyczna osi portu
  effectiveLengthMm: number; // długość akustyczna po korekcji końcowej
  targetFbHz: number; // zadana częstotliwość strojenia
  autoCalculateLength: boolean; // czy automatycznie liczyć długość pod targetFbHz
  wallThicknessMm: number; // grubość ścianek portu (zwykle równa panelThickness)
  portLocation: 'front_bottom' | 'front_right' | 'front_left';
  hasCornerReflector: boolean; // ścięcie 45 stopni na załamaniu portu
  flangeType: 'both_flanged' | 'one_flanged' | 'free'; // wpływ na korekcję końcową k
}

export interface BracingConfig {
  type: 'none' | 'shelf_window' | 'cross_dowels';
  thicknessMm: number;
  displacementLiters: number;
  count: number;
}

export interface BandpassConfig {
  frontChamberRatio: number; // np. 0.40 (40% objętości netto to komora przednia)
  rearFbHz?: number; // dla 6th order strojenie komory tylnej [Hz]
  rearPortDiameterMm?: number; // dla 6th order średnica rury tylnej [mm]
  dividerPositionMm?: number;
}

export interface EnclosureConfig {
  type: EnclosureType;
  joinery: JoineryStyle;
  material: MaterialType;
  panelThicknessMm: number; // grubość płyt zewnętrznych (np. 18mm, 19mm, 22mm)
  hasDoubleBaffle: boolean; // podwójny front (druga płyta usztywniająca / pod frezowanie)
  doubleBaffleThicknessMm: number;
  
  // Wymiary zewnętrzne [mm]
  outerWidthMm: number;
  outerHeightMm: number;
  outerDepthMm: number;
  
  // Konfiguracja przetworników
  driverCount: 1 | 2 | 4;
  driverArrangement: 'standard' | 'isobaric' | 'push_pull';
  driverMountFacing: 'outward' | 'inverted';
  driverOffsetXOffsetMm?: number; // przesunięcie głośnika lewo (-) / prawo (+) od osi środka [mm]
  driverOffsetYOffsetMm?: number; // przesunięcie głośnika dół (-) / góra (+) od osi środka [mm]
  
  // Port
  port: PortConfig;

  // Konfiguracja Bandpass (gdy type === 'bandpass_4th' | 'bandpass_6th')
  bandpass?: BandpassConfig;
  
  // Wzmocnienia
  bracing: BracingConfig;
  
  // Dodatkowe elementy (zwrotnica, wytłumienie, terminale)
  dampingAbsorptionFactor: number; // 1.0 = brak, 1.15 = 50% wytłumienie, 1.25 = 100% wytłumienie
  terminalDisplacementLiters: number;
}

export interface VolumeBalance {
  grossExternalLiters: number; // W_ext * H_ext * D_ext
  wallPanelsLiters: number; // objętość drewna ścian zewnętrznych
  grossInternalLiters: number; // objętość wewnętrzna czysta przed wyposażeniem
  driverDisplacementLiters: number; // wyparcie magnesu/kosza przetworników
  portWoodDisplacementLiters: number; // objętość płyt tworzących tunel
  portAirVolumeLiters: number; // słup powietrza w porcie (nie pracuje dla komory!)
  bracingDisplacementLiters: number; // wyparcie wzmocnień wewnętrznych
  terminalsDisplacementLiters: number; // terminale i inne elementy
  netAcousticVolumeLiters: number; // rzeczywista objętość akustyczna Vb
  effectiveVolumeWithDampingLiters: number; // pozorna objętość po uwzględnieniu wytłumienia
  
  // Bandpass breakdown
  isBandpass?: boolean;
  rearChamberVolumeLiters?: number;
  frontChamberVolumeLiters?: number;
  internalBaffleWoodLiters?: number;
}
