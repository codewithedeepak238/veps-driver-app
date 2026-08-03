import type { TFunction } from 'i18next';

export type RepairStatus = 'PENDING' | 'ACCEPTED' | 'FIXED';

export type MechRequest = {
  id: string;
  reason: 'VEHICLE_ISSUE' | 'MACHINE_ISSUE';
  note: string | null;
  repairStatus: RepairStatus | null;
  startedAt: string;
  acceptedAt: string | null;
  fixedAt: string | null;
  mechanicNote: string | null;
  repairMedia?: { id: string; url: string; s3Key: string }[];
  trip?: {
    id: string;
    vehiclePlate: string | null;
    machineNumber: string | null;
    startLocationName: string | null;
    startLatitude: number | null;
    startLongitude: number | null;
    startedAt: string;
    driver?: { id: string; name: string; phone: string } | null;
    zone?: { name: string } | null;
  } | null;
};

export { reasonLabel } from './reasons';

export const getStatusMeta = (t: TFunction): Record<RepairStatus, { label: string; bg: string; color: string; border: string }> => ({
  PENDING: { label: t('repairStatus.pending'), bg: '#fffbeb', color: '#b45309', border: '#fde68a' },
  ACCEPTED: { label: t('repairStatus.accepted'), bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
  FIXED: { label: t('repairStatus.fixed'), bg: '#ecfdf5', color: '#047857', border: '#a7f3d0' },
});

export const timeStr = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short', hour12: true } as any);
