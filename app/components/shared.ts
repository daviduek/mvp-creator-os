/**
 * Upload an asset to R2.
 *
 * Small files (≤4MB — generated Sasha images) go through the server (/api/upload),
 * which forwards to R2 server-side — no browser CORS needed. Larger files (videos)
 * use a presigned direct PUT (requires R2 CORS configured for the Vercel origin).
 */
const SERVER_LIMIT = 4 * 1024 * 1024; // 4MB (under Vercel's 4.5MB body cap)

export async function uploadAsset(file: File): Promise<string> {
  // Images: downscale in the browser so they're always <4MB → always go through
  // the server (/api/upload), avoiding the R2-CORS-required presigned PUT entirely.
  let f = file;
  if (file.type.startsWith('image/')) {
    try { f = await downscaleImage(file); } catch { /* keep original on failure */ }
  }
  if (f.size <= SERVER_LIMIT) return uploadViaServer(f);
  return uploadViaPresigned(f); // only large videos hit this (needs R2 CORS)
}

/** Resize an image to maxDim on its longest side and re-encode as JPEG. */
function downscaleImage(file: File, maxDim = 1600, quality = 0.92): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objUrl);
      let { width, height } = img;
      const scale = Math.min(1, maxDim / Math.max(width, height));
      width = Math.round(width * scale);
      height = Math.round(height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('canvas no disponible'));
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob) return reject(new Error('no se pudo redimensionar'));
          resolve(new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' }));
        },
        'image/jpeg',
        quality,
      );
    };
    img.onerror = () => { URL.revokeObjectURL(objUrl); reject(new Error('no se pudo leer la imagen')); };
    img.src = objUrl;
  });
}

async function uploadViaServer(file: File): Promise<string> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch('/api/upload', { method: 'POST', body: form });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error subiendo archivo');
  return data.url;
}

async function uploadViaPresigned(file: File): Promise<string> {
  const ext = (file.name.split('.').pop() || 'bin').toLowerCase();
  const kind = file.type.startsWith('video/') ? 'video' : 'image';
  const contentType = file.type || 'application/octet-stream';

  const presignRes = await fetch('/api/upload-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contentType, ext, kind }),
  });
  const presignData = await presignRes.json();
  if (!presignRes.ok) throw new Error(presignData.error || 'Error pidiendo URL de subida');
  const { uploadUrl, publicUrl } = presignData;

  const putRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body: file,
  });
  if (!putRes.ok) {
    throw new Error(
      `Error subiendo a R2 (${putRes.status}). Si es un video grande, falta configurar CORS en el bucket.`,
    );
  }
  return publicUrl || uploadUrl.split('?')[0];
}
