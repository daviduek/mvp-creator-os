/** Upload an asset to R2 via presigned URL (bypasses Vercel body limit). */
export async function uploadAsset(file: File): Promise<string> {
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
  if (!putRes.ok) throw new Error(`Error subiendo a R2 (${putRes.status})`);

  return publicUrl || uploadUrl.split('?')[0];
}
