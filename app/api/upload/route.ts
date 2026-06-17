import { NextRequest, NextResponse } from 'next/server';
import { uploadToR2, generateKey } from '../../lib/r2';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'Archivo requerido' }, { status: 400 });

    const ext = (file.name.split('.').pop() || 'bin').toLowerCase();
    const folder = file.type.startsWith('video/') ? 'uploads/video' : 'uploads/image';
    const key = generateKey(folder, ext);
    const buffer = Buffer.from(await file.arrayBuffer());
    const url = await uploadToR2(key, buffer, file.type || 'application/octet-stream');
    return NextResponse.json({ url, key });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error al subir';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
