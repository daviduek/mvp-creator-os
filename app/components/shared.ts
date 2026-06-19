/**
 * Upload an asset to R2.
 *
 * Small files (≤4MB — generated Sasha images) go through the server (/api/upload),
 * which forwards to R2 server-side — no browser CORS needed. Larger files (videos)
 * use a presigned direct PUT (requires R2 CORS configured for the Vercel origin).
 */
const SERVER_LIMIT = 4 * 1024 * 1024; // 4MB (under Vercel's 4.5MB body cap)

export async function uploadAsset(file: File): Promise<string> {
  if (file.size <= SERVER_LIMIT) return uploadViaServer(file);
  return uploadViaPresigned(file);
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
