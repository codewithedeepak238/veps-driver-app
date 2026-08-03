import type { TFunction } from 'i18next';

const REASON_KEYS: Record<string, string> = {
  VEHICLE_ISSUE: 'reasons.vehicleIssue',
  MACHINE_ISSUE: 'reasons.machineIssue',
  LUNCH_BREAK: 'reasons.lunchBreak',
  OTHER: 'reasons.others',
};

export function reasonLabel(reason: string, t: TFunction): string {
  const key = REASON_KEYS[reason];
  return key ? t(key) : reason;
}
