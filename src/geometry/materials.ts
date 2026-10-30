import { MaterialType } from '../types/enclosure';

export interface MaterialInfo {
  name: string;
  densityKgM3: number;
}

const MATERIALS: Record<MaterialType, MaterialInfo> = {
  mdf: { name: 'MDF surowy', densityKgM3: 750 },
  baltic_birch: { name: 'Sklejka Bałtycka', densityKgM3: 680 },
  plywood: { name: 'Sklejka Iglasta', densityKgM3: 550 },
  hsb: { name: 'Płyta HSB', densityKgM3: 750 }
};

export function getMaterialInfo(material: MaterialType): MaterialInfo {
  return MATERIALS[material] || MATERIALS.mdf;
}
