import { NextRequest, NextResponse } from 'next/server';
import { poll } from '../../../lib/providers/router';
import { uploadToR2, generateKey } from '../../../lib/r2';

export const maxDuration = 60;

export async function GET(_req: NextRequest, { params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  if (!jobId) return NextResponse.json({ error: 'jobId requerido' }, { status: 400 });

  try {
    const result = await poll(jobId);

    // RunPod returns base64 inline; push it to R2 and hand back a URL.
    if (result.status === 'completed' && result.url?.startsWith('base64:')) {
      const [, filename, data] = result.url.split(':');
      const ext = (filename?.split('.').pop() || 'png').toLowerCase();
      const isVideo = ['mp4', 'webm', 'mov'].includes(ext);
      const key = generateKey(isVideo ? 'outputs/video' : 'outputs/image', ext);
      const buffer = Buffer.from(data, 'base64');
      const ct = isVideo ? 'video/mp4' : ext === 'png' ? 'image/png' : 'image/jpeg';
      const url = await uploadToR2(key, buffer, ct);
      return NextResponse.json({ status: 'completed', url });
    }

    return NextResponse.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error interno';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
