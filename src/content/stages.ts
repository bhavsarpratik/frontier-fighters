export interface StageDef { id: string; name: string; subtitle: string; music: number }

export const STAGES: StageDef[] = [
  { id: 'datacenter', name: 'GPU DATACENTER', subtitle: 'Where the H-whatevers hum', music: 0 },
  { id: 'rooftop', name: 'SF ROOFTOP', subtitle: 'Golden hour, seed round', music: 1 },
  { id: 'warehouse', name: 'LABELING WAREHOUSE', subtitle: 'Every box needs a bounding box', music: 2 },
  { id: 'queue', name: 'THE RESET QUEUE', subtitle: 'They just want their limits back', music: 3 },
];
