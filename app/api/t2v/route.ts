import { NextRequest, NextResponse } from 'next/server';
import { submitJob } from '../../lib/runpod';
import { buildT2VWorkflow } from '../../lib/workflows';

export async function POST(req: NextRequest) {
  try {
    const { prompt, duration } = await req.json();
    if (!prompt?.trim()) return NextResponse.json({ error: 'Prompt requerido' }, { status: 400 });

    const workflow = buildT2VWorkflow({ prompt, duration: duration || 5 });
    const jobId = await submitJob(workflow);
    return NextResponse.json({ jobId });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error interno';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
