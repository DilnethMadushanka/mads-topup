// Cloudflare R2 Storage Service for MADS TOPUP
// Bucket Endpoint: https://bfda3f43ac31b00be80bcb82772eb8fa.r2.cloudflarestorage.com
// Bucket Name: mads-topup

const DEFAULT_R2_BUCKET_URL = import.meta.env.VITE_R2_BUCKET_URL || 'https://bfda3f43ac31b00be80bcb82772eb8fa.r2.cloudflarestorage.com/mads-topup';
const DEFAULT_ACCESS_KEY_ID = '380f431fa8c9fb98e1f3a5da3be0bd70';
const DEFAULT_SECRET_ACCESS_KEY = '••••••••••••';

export const getR2Config = () => {
  const stored = localStorage.getItem('mads_r2_config');
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      return {
        ...parsed,
        secretAccessKey: '••••••••••••'
      };
    } catch (e) {}
  }
  return {
    bucketUrl: DEFAULT_R2_BUCKET_URL,
    bucketName: 'mads-topup',
    accessKeyId: DEFAULT_ACCESS_KEY_ID,
    secretAccessKey: '••••••••••••',
    endpoint: 'https://bfda3f43ac31b00be80bcb82772eb8fa.r2.cloudflarestorage.com',
    region: 'auto',
    status: 'ACTIVE'
  };
};

export const saveR2Config = (config) => {
  localStorage.setItem('mads_r2_config', JSON.stringify(config));
};

export const getR2AssetUrl = (fileName) => {
  if (!fileName) return '';
  if (fileName.startsWith('http://') || fileName.startsWith('https://')) {
    return fileName;
  }
  const config = getR2Config();
  const baseUrl = config.bucketUrl.replace(/\/$/, '');
  const cleanPath = fileName.replace(/^\//, '');
  return `${baseUrl}/${cleanPath}`;
};

const R2_UPLOAD_MAX_BYTES = 5 * 1024 * 1024; // 5MB

const fileToBase64 = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = () => reject(reader.error || new Error('Failed to read file'));
  reader.readAsDataURL(file);
});

// Uploads a file to the Cloudflare R2 bucket via the server's /api/upload-file
// proxy (the R2 write credentials only ever live server-side — they must
// never be shipped in the client bundle). Returns a real success/failure
// result; unlike the previous stub implementation, a failed or unreachable
// upload is reported as a failure rather than a fabricated success with a
// URL that points to nothing.
export const uploadToR2Storage = async (file, folder = 'receipts') => {
  if (!file) {
    return { success: false, error: 'No file provided.' };
  }
  if (file.size > R2_UPLOAD_MAX_BYTES) {
    return { success: false, error: 'File is too large. Maximum size is 5MB.' };
  }

  let dataUrl;
  try {
    dataUrl = await fileToBase64(file);
  } catch (e) {
    return { success: false, error: 'Could not read the selected file.' };
  }

  const payload = {
    fileName: file.name || 'file',
    fileType: file.type || 'application/octet-stream',
    fileDataBase64: dataUrl,
    folder
  };

  const endpoints = ['/api/upload-file', 'https://madstopup.com/api/upload-file'];
  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        return data;
      }
      if (data?.error) {
        // A definitive server-side rejection (too large, bad type, storage
        // not configured) — no point trying the other endpoint.
        return { success: false, error: data.error };
      }
    } catch (e) {
      console.warn(`[R2 Upload] ${endpoint} unreachable:`, e.message);
    }
  }

  return { success: false, error: 'Upload failed. Please check your connection and try again.' };
};
