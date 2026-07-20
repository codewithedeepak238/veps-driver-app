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

/** Opens the camera to capture a photo or video, or null if cancelled. */
export async function captureMedia(): Promise<PickedAsset[] | null> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) throw new Error('Camera access is required to capture media.');

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images', 'videos'],
    quality: 0.7,
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
