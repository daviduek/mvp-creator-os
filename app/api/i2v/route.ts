import { NextRequest, NextResponse } from 'next/server';
import { submitJob } from '../../lib/runpod';
import { buildI2VWorkflow } from '../../lib/workflows';

export async function POST(req: NextRequest) {
  try {
    const { image_url, prompt, resolution, duration } = await req.json();
    if (!image_url) return NextResponse.json({ error: 'image_url requerido' }, { status: 400 });

    const workflow = buildI2VWorkflow({
      image_url,
      prompt: prompt || '',
      resolution: resolution || '480p',
      duration: duration || 5,
    });

    const jobId = await submitJob(workflow);
    return NextResponse.json({ jobId });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error interno';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
