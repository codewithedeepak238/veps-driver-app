import * as ImagePicker from 'expo-image-picker';
import api from './api';

export type MediaPhase = 'START' | 'DURING' | 'END';

export interface PickedAsset {
  uri: string;
  type: 'PHOTO' | 'VIDEO';
  contentType: string;
  filename: string;
}

function toAssets(assets: ImagePicker.ImagePickerAsset[]): PickedAsset[] {
  return assets.map((a) => {
    const isVideo = a.type === 'video';
    return {
      uri: a.uri,
      type: isVideo ? 'VIDEO' : 'PHOTO',
      contentType: a.mimeType || (isVideo ? 'video/mp4' : 'image/jpeg'),
      filename: a.fileName || (isVideo ? 'video.mp4' : 'photo.jpg'),
    };
  });
}

/** Opens the gallery and returns the picked assets (no upload yet), or null if cancelled. */
export async function pickMedia(multiple = true): Promise<PickedAsset[] | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) throw new Error('Photo library access is required to attach media.');

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images', 'videos'],
    quality: 0.7,
    allowsMultipleSelection: multiple,
  });
  if (result.canceled || !result.assets?.length) return null;
  return toAssets(result.assets);
}

/**
 * Opens the camera in PHOTO mode. The camera must be launched with a single
 * media type — passing both images and videos makes the native camera capture
 * photos only (this was why "record video" never worked). So photo and video
 * capture are separate entry points.
 */
export async function capturePhoto(): Promise<PickedAsset[] | null> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) throw new Error('Camera access is required to take a photo.');

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    quality: 0.7,
  });
  if (result.canceled || !result.assets?.length) return null;
  return toAssets(result.assets);
}

/** Opens the camera in VIDEO mode to record a live video, or null if cancelled. */
export async function captureVideo(): Promise<PickedAsset[] | null> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) throw new Error('Camera access is required to record a video.');

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ['videos'],
    quality: 0.7,
    videoMaxDuration: 120,
  });
  if (result.canceled || !result.assets?.length) return null;
  return toAssets(result.assets);
}

/** Uploads one already-picked asset to S3 (presign → PUT → register) for a trip. */
export async function uploadAsset(tripId: string, phase: MediaPhase, asset: PickedAsset) {
  const presign = await api.post(`/driver/trips/${tripId}/media/presign`, {
    type: asset.type,
    phase,
    contentType: asset.contentType,
    filename: asset.filename,
  });
  const { uploadUrl, key, publicUrl } = presign.data.data;

  const blob = await (await fetch(asset.uri)).blob();
  const put = await fetch(uploadUrl, {
    method: 'PUT',
    body: blob,
    headers: { 'Content-Type': asset.contentType },
  });
  if (!put.ok) throw new Error(`Upload failed (${put.status})`);

  const reg = await api.post(`/driver/trips/${tripId}/media`, {
    type: asset.type,
    phase,
    s3Key: key,
    url: publicUrl,
  });
  return reg.data.data.media;
}

/** Convenience: pick then immediately upload (for during/end when the trip exists). */
export async function pickAndUploadMedia(tripId: string, phase: MediaPhase) {
  const assets = await pickMedia(true);
  if (!assets) return 0;
  for (const a of assets) await uploadAsset(tripId, phase, a);
  return assets.length;
}

// ── Fuel slip (single photo, gallery or camera) ───────────────────────────────

/** Take a live photo of a fuel slip. */
export async function captureSlip(): Promise<PickedAsset | null> {
  const assets = await capturePhoto();
  return assets?.[0] ?? null;
}

/** Pick a single fuel-slip image from the gallery. */
export async function pickSlip(): Promise<PickedAsset | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) throw new Error('Photo library access is required to attach the slip.');

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.7,
    allowsMultipleSelection: false,
  });
  if (result.canceled || !result.assets?.length) return null;
  return toAssets(result.assets)[0] ?? null;
}

/** Uploads a repair photo (mechanic fixing a breakdown) to S3 and registers it. */
export async function uploadRepairMedia(breakdownId: string, asset: PickedAsset): Promise<{ key: string; url: string }> {
  const presign = await api.post(`/mechanic/requests/${breakdownId}/media/presign`, {
    contentType: asset.contentType,
    filename: asset.filename,
  });
  const { uploadUrl, key, publicUrl } = presign.data.data;

  const blob = await (await fetch(asset.uri)).blob();
  const put = await fetch(uploadUrl, { method: 'PUT', body: blob, headers: { 'Content-Type': asset.contentType } });
  if (!put.ok) throw new Error(`Upload failed (${put.status})`);

  await api.post(`/mechanic/requests/${breakdownId}/media`, { s3Key: key, url: publicUrl });
  return { key, url: publicUrl };
}

/** Uploads an odometer/engine meter photo (at trip start) and returns key + URL. */
export async function uploadMeterImage(asset: PickedAsset): Promise<{ key: string; url: string }> {
  const presign = await api.post('/driver/meter-image/presign', {
    contentType: asset.contentType,
    filename: asset.filename,
  });
  const { uploadUrl, key, publicUrl } = presign.data.data;

  const blob = await (await fetch(asset.uri)).blob();
  const put = await fetch(uploadUrl, { method: 'PUT', body: blob, headers: { 'Content-Type': asset.contentType } });
  if (!put.ok) throw new Error(`Upload failed (${put.status})`);
  return { key, url: publicUrl };
}

/** Uploads a fuel-slip photo to S3 and returns its key + public URL. */
export async function uploadFuelSlip(asset: PickedAsset): Promise<{ key: string; url: string }> {
  const presign = await api.post('/driver/fuel-fillings/presign', {
    contentType: asset.contentType,
    filename: asset.filename,
  });
  const { uploadUrl, key, publicUrl } = presign.data.data;

  const blob = await (await fetch(asset.uri)).blob();
  const put = await fetch(uploadUrl, {
    method: 'PUT',
    body: blob,
    headers: { 'Content-Type': asset.contentType },
  });
  if (!put.ok) throw new Error(`Slip upload failed (${put.status})`);

  return { key, url: publicUrl };
}
