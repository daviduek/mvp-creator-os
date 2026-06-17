import { NextRequest, NextResponse } from 'next/server';
import { getJob } from '../../../lib/runpod';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  if (!jobId) return NextResponse.json({ error: 'jobId requerido' }, { status: 400 });

  try {
    const job = await getJob(jobId);
    if (job.status === 'COMPLETED') {
      const url = job.output?.url || job.output?.images?.[0] || job.output?.videos?.[0];
      return NextResponse.json({ status: 'completed', url });
    }
    if (job.status === 'FAILED' || job.status === 'CANCELLED') {
      return NextResponse.json({ status: 'failed', error: job.error || job.output?.message || 'Job falló' });
    }
    return NextResponse.json({ status: job.status === 'IN_PROGRESS' ? 'processing' : 'queued' });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error interno';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
