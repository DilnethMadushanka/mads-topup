import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

// Vercel-side counterpart to server.js's /api/upload-file. Forwards to the
// VPS first (primary path); only runs the upload itself if the VPS is
// unreachable. See server.js for why this exists — uploadToR2Storage() in
// storageService.js used to be a pure stub that never uploaded anything.
const R2_UPLOAD_MAX_BYTES = 5 * 1024 * 1024; // 5MB
const R2_ALLOWED_FOLDERS = new Set(['receipts', 'support-attachments', 'popup_ads']);

function sanitizeFileName(name) {
  if (typeof name !== 'string') return 'file';
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').substring(0, 100) || 'file';
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) { body = {}; }
  }
  body = body || {};

  // 1. Forward to the VPS first
  try {
    const vpsRes = await fetch('http://152.42.202.221:3000/api/upload-file', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (vpsRes.ok || vpsRes.status < 500) {
      const text = await vpsRes.text();
      res.status(vpsRes.status);
      try { return res.json(JSON.parse(text)); } catch (e) { return res.send(text); }
    }
  } catch (vpsErr) {
    console.warn('[Upload VPS Forward Note]:', vpsErr.message);
  }

  // 2. Direct Vercel execution fallback
  try {
    if (!(process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY && process.env.R2_ENDPOINT)) {
      return res.status(503).json({ success: false, error: 'File storage is not configured on the server.' });
    }

    const { fileName, fileType, fileDataBase64, folder } = body;
    if (!fileDataBase64 || typeof fileDataBase64 !== 'string') {
      return res.status(400).json({ success: false, error: 'Missing file data.' });
    }
    const cleanFolder = R2_ALLOWED_FOLDERS.has(folder) ? folder : 'receipts';

    const base64Data = fileDataBase64.includes(',') ? fileDataBase64.split(',').pop() : fileDataBase64;
    const buffer = Buffer.from(base64Data, 'base64');
    if (buffer.length === 0) {
      return res.status(400).json({ success: false, error: 'Empty file.' });
    }
    if (buffer.length > R2_UPLOAD_MAX_BYTES) {
      return res.status(413).json({ success: false, error: 'File is too large. Maximum size is 5MB.' });
    }

    const safeName = sanitizeFileName(fileName);
    const key = `${cleanFolder}/${Date.now()}_${safeName}`;
    const bucketName = process.env.VITE_R2_BUCKET_NAME || process.env.R2_BUCKET_NAME || 'mads-topup';

    const r2Client = new S3Client({
      region: 'auto',
      endpoint: process.env.R2_ENDPOINT,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
      }
    });

    await r2Client.send(new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: buffer,
      ContentType: fileType || 'application/octet-stream'
    }));

    const bucketUrl = (process.env.VITE_R2_BUCKET_URL || process.env.R2_BUCKET_URL || `${process.env.R2_ENDPOINT}/${bucketName}`).replace(/\/$/, '');
    const url = `${bucketUrl}/${key}`;

    res.json({ success: true, key, url, bucket: bucketName, size: buffer.length });
  } catch (err) {
    console.error('[R2 Upload Error - Vercel]:', err.message);
    res.status(500).json({ success: false, error: 'Upload failed. Please try again.' });
  }
}
