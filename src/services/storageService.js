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

const compressImage = (file, maxWidth = 1000, maxHeight = 1000, quality = 0.75) => {
  return new Promise((resolve) => {
    if (!file || !file.type?.startsWith('image/')) {
      fileToBase64(file).then(resolve).catch(() => resolve(''));
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new window.Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxWidth || height > maxHeight) {
          if (width / height > maxWidth / maxHeight) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => resolve(e.target.result);
      img.src = e.target.result;
    };
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
};

// Uploads a file to the Cloudflare R2 bucket or local server storage via the server's /api/upload-file proxy.
// If the server storage is not configured or temporarily unreachable, gracefully falls back to client-side
// compressed image encoding so the user is never blocked from attaching receipts or support screenshots.
export const uploadToR2Storage = async (file, folder = 'receipts') => {
  if (!file) {
    return { success: false, error: 'No file provided.' };
  }
  if (file.size > R2_UPLOAD_MAX_BYTES) {
    return { success: false, error: 'File is too large. Maximum size is 5MB.' };
  }

  let dataUrl;
  try {
    // If it's an image, auto-compress to a reasonable resolution for fast upload & instant fallback
    dataUrl = await compressImage(file);
    if (!dataUrl) dataUrl = await fileToBase64(file);
  } catch (e) {
    return { success: false, error: 'Could not read the selected file.' };
  }

  const payload = {
    fileName: file.name || 'file',
    fileType: file.type || 'image/jpeg',
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
    } catch (e) {
      console.warn(`[Storage Upload] ${endpoint} unreachable:`, e.message);
    }
  }

  // Graceful zero-fail fallback: if server storage is unconfigured on VPS or endpoint fails,
  // use the compressed image dataUrl directly so the screenshot can still be sent and viewed!
  if (dataUrl && dataUrl.startsWith('data:image/')) {
    console.log('[Storage Fallback] Utilizing client-compressed image data URL for instant delivery.');
    return {
      success: true,
      url: dataUrl,
      isClientFallback: true
    };
  }

  return { success: false, error: 'Upload failed. Please check your connection and try again.' };
};
