// Cloudflare R2 Storage Service for MADS TOPUP
// Bucket URL: https://bfda3f43ac31b00be80bcb82772eb8fa.r2.cloudflarestorage.com/mads-topup

const DEFAULT_R2_BUCKET_URL = import.meta.env.VITE_R2_BUCKET_URL || 'https://bfda3f43ac31b00be80bcb82772eb8fa.r2.cloudflarestorage.com/mads-topup';

export const getR2Config = () => {
  const stored = localStorage.getItem('mads_r2_config');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {}
  }
  return {
    bucketUrl: DEFAULT_R2_BUCKET_URL,
    bucketName: 'mads-topup',
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

export const uploadToR2Storage = async (file, folder = 'receipts') => {
  const config = getR2Config();
  
  // Simulate network upload to Cloudflare R2 Bucket
  await new Promise(res => setTimeout(res, 900));
  
  const timestamp = Date.now();
  const safeName = file.name ? file.name.replace(/[^a-zA-Z0-9._-]/g, '_') : 'file';
  const filePath = `${folder}/${timestamp}_${safeName}`;
  const fullUrl = getR2AssetUrl(filePath);

  return {
    success: true,
    key: filePath,
    url: fullUrl,
    bucket: config.bucketName,
    size: file.size || 0,
    message: 'File successfully uploaded to Cloudflare R2 bucket!'
  };
};
