export interface SceneAsset {
  url: string;
  bytes: number;
  sha256: string;
  triangles: number;
  bounds: { min: number[]; max: number[] };
  clips: string[];
  sockets: string[];
  morphs: string[];
  materials: string[];
}
export interface SceneAssetManifest {
  version: number;
  artStatus: string;
  units: 'meters';
  axes: 'Y-up; mound -Z';
  markers: Record<string, {release?: number; contact?: number}>;
  tiers: Record<'low'|'high',Record<'aoi'|'reina'|'field'|'support'|'equipment',SceneAsset>>;
}
