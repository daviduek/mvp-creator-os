import { NextRequest, NextResponse } from 'next/server';
import { getJob } from '../../../lib/runpod';
import { uploadToR2, generateKey } from '../../../lib/r2';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  if (!jobId) return NextResponse.json({ error: 'jobId requerido' }, { status: 400 });

  try {
    const job = await getJob(jobId);
    if (job.status === 'COMPLETED') {
      const out = job.output;
      const images = out?.images || [];
      if (!images.length) {
        return NextResponse.json({ status: 'failed', error: out?.message || 'Sin outputs' });
      }
      const first = images[0];
      // If the worker returned a URL directly, use it.
      if (first.type === 's3_url' && first.data) {
        return NextResponse.json({ status: 'completed', url: first.data });
      }
      // Otherwise the worker returned base64 — push it to R2 ourselves.
      if (first.type === 'base64' && first.data) {
        const ext = (first.filename?.split('.').pop() || 'png').toLowerCase();
        const key = generateKey('outputs/image', ext);
        const buffer = Buffer.from(first.data, 'base64');
        const url = await uploadToR2(key, buffer, ext === 'png' ? 'image/png' : 'image/jpeg');
        return NextResponse.json({ status: 'completed', url });
      }
      return NextResponse.json({ status: 'failed', error: 'Output format desconocido' });
    }
    if (job.status === 'FAILED' || job.status === 'CANCELLED') {
      const msg = job.error || job.output?.message || job.output?.errors?.[0] || 'Job falló';
      return NextResponse.json({ status: 'failed', error: msg });
    }
    return NextResponse.json({ status: job.status === 'IN_PROGRESS' ? 'processing' : 'queued' });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error interno';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
