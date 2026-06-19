import { NextRequest, NextResponse } from 'next/server';
import { poll } from '../../../lib/providers/router';
import { uploadToR2, generateKey } from '../../../lib/r2';
import { enhanceImage } from '../../../lib/providers/enhance';

export const maxDuration = 60;

export async function GET(_req: NextRequest, { params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  if (!jobId) return NextResponse.json({ error: 'jobId requerido' }, { status: 400 });

  try {
    const result = await poll(jobId);
    if (result.status !== 'completed' || !result.url) {
      return NextResponse.json(result);
    }

    // RunPod returns base64 inline; push it to R2 first.
    let url = result.url;
    let isImage = true;
    if (url.startsWith('base64:')) {
      const [, filename, data] = url.split(':');
      const ext = (filename?.split('.').pop() || 'png').toLowerCase();
      const isVideo = ['mp4', 'webm', 'mov'].includes(ext);
      isImage = !isVideo;
      const key = generateKey(isVideo ? 'outputs/video' : 'outputs/image', ext);
      const buffer = Buffer.from(data, 'base64');
      const ct = isVideo ? 'video/mp4' : ext === 'png' ? 'image/png' : 'image/jpeg';
      url = await uploadToR2(key, buffer, ct);
    } else {
      isImage = /\.(png|jpe?g|webp)(\?|$)/i.test(url);
    }

    // Realism upscaler pass (images only). Never throws — falls back to original.
    if (isImage) {
      url = await enhanceImage(url);
    }

    return NextResponse.json({ status: 'completed', url });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error interno';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
