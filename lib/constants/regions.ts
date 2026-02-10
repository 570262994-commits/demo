export const REGIONS = ['全国', '华东', '华北', '华南', '华中', '西南', '西北'] as const;

export type Region = typeof REGIONS[number];

export const isValidRegion = (region: string): region is Region => {
  return REGIONS.includes(region as Region);
};