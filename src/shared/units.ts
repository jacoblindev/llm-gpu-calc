import type { UnitPreference } from './types';

export function bytesToGiB(bytes: number): number {
  return bytes / (1024 ** 3);
}

export function bytesToGB(bytes: number): number {
  return bytes / (1000 ** 3);
}

export function formatBytes(bytes: number, unit: UnitPreference, decimals = 1): string {
  const value = unit === 'GiB' ? bytesToGiB(bytes) : bytesToGB(bytes);
  return `${value.toFixed(decimals)} ${unit}`;
}

