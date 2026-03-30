export interface UploadedAsset {
  id: string;
  name: string;
  url: string;
  fileName?: string;
  size: number;
  duration?: number;
  uploadedAt: number;
}

const ASSET_TOKEN_KEY = 'auth_token';
export const MAX_SOUND_FILE_SIZE = 2 * 1024 * 1024;
export const MAX_BGM_FILE_SIZE = 10 * 1024 * 1024;
const MAX_RETRY_COUNT = 2;

async function getAudioDuration(file: File): Promise<number> {
  return await new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio();
    audio.preload = 'metadata';
    audio.src = url;
    audio.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(Number.isFinite(audio.duration) ? audio.duration : 0);
    };
    audio.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(0);
    };
  });
}

async function uploadWithRetry(file: File, endpoint: string): Promise<UploadedAsset> {
  let lastError: unknown = null;
  for (let i = 0; i < MAX_RETRY_COUNT; i += 1) {
    try {
      return await uploadWithOptionalApi(file, endpoint);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error('上传失败，请稍后重试');
}

async function uploadWithOptionalApi(file: File, endpoint: string): Promise<UploadedAsset> {
  const formData = new FormData();
  formData.append('file', file);

  const token = localStorage.getItem(ASSET_TOKEN_KEY) || '';
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: token ? { token } : undefined,
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`上传失败: ${response.status}`);
  }

  const data = await response.json();
  const url = data?.data?.url || data?.url;
  if (!url || typeof url !== 'string') {
    throw new Error('上传接口未返回可用的 url');
  }

  const duration = await getAudioDuration(file);

  return {
    id: data?.data?.id || `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name: file.name.replace(/\.mp3$/i, ''),
    url,
    fileName: data?.data?.fileName || file.name,
    size: file.size,
    duration,
    uploadedAt: Date.now(),
  };
}

async function createLocalAsset(file: File): Promise<UploadedAsset> {
  const duration = await getAudioDuration(file);
  return {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name: file.name.replace(/\.mp3$/i, ''),
    url: URL.createObjectURL(file),
    fileName: file.name,
    size: file.size,
    duration,
    uploadedAt: Date.now(),
  };
}

async function deleteWithOptionalApi(endpoint: string, asset: UploadedAsset): Promise<void> {
  const token = localStorage.getItem(ASSET_TOKEN_KEY) || '';
  await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { token } : {}),
    },
    body: JSON.stringify({
      id: asset.id,
      url: asset.url,
      fileName: asset.fileName || '',
    }),
  });
}

export async function uploadSoundEffectAsset(file: File): Promise<UploadedAsset> {
  if (file.size > MAX_SOUND_FILE_SIZE) {
    throw new Error('特效音文件大小不能超过 2MB');
  }
  const endpoint = (import.meta.env.VITE_UPLOAD_SOUND_API || '').trim();
  if (endpoint) {
    return await uploadWithRetry(file, endpoint);
  }
  return await createLocalAsset(file);
}

export async function uploadBackgroundMusicAsset(file: File): Promise<UploadedAsset> {
  if (file.size > MAX_BGM_FILE_SIZE) {
    throw new Error('背景音乐文件大小不能超过 10MB');
  }
  const endpoint = (import.meta.env.VITE_UPLOAD_BGM_API || '').trim();
  if (endpoint) {
    return await uploadWithRetry(file, endpoint);
  }
  return await createLocalAsset(file);
}

export async function deleteSoundEffectAsset(asset: UploadedAsset): Promise<void> {
  const endpoint = (import.meta.env.VITE_DELETE_SOUND_API || '').trim();
  if (endpoint) {
    await deleteWithOptionalApi(endpoint, asset);
  }
}

export async function deleteBackgroundMusicAsset(asset: UploadedAsset): Promise<void> {
  const endpoint = (import.meta.env.VITE_DELETE_BGM_API || '').trim();
  if (endpoint) {
    await deleteWithOptionalApi(endpoint, asset);
  }
}
