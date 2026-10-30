export interface PanelCutout {
  id: string;
  type: 'driver_through' | 'driver_rebate' | 'port_opening' | 'terminal_hole';
  xMm: number; // offset from panel bottom-left center
  yMm: number;
  diameterMm?: number;
  widthMm?: number;
  heightMm?: number;
  depthMm?: number; // for pocket rebate
}

export interface Panel3D {
  id: string;
  namePl: string; // np. "Górna płyta (Top)", "Front zewnętrzny"
  widthMm: number;
  heightMm: number;
  thicknessMm: number;
  positionMm: [number, number, number]; // [X, Y, Z]
  rotationRad: [number, number, number];
  colorHex: string;
  isPortPanel?: boolean;
  isBracing?: boolean;
  cutouts: PanelCutout[];
  visible: boolean;
}

export interface CutListItem {
  id: string;
  panelName: string;
  widthMm: number;
  lengthMm: number;
  thicknessMm: number;
  quantity: number;
  material: string;
  notes: string;
}

export interface CollisionWarning {
  severity: 'error' | 'warning' | 'info';
  code: string;
  messagePl: string;
  detailPl: string;
}
