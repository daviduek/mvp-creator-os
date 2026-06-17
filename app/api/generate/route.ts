import { NextRequest, NextResponse } from 'next/server';
import { submitJob } from '../../lib/runpod';
import { buildT2IWorkflow } from '../../lib/workflows';

export async function POST(req: NextRequest) {
  try {
    const { prompt, aspect_ratio, lora_weight, seed } = await req.json();
    if (!prompt?.trim()) return NextResponse.json({ error: 'Prompt requerido' }, { status: 400 });

    const workflow = buildT2IWorkflow({
      prompt,
      aspect_ratio: aspect_ratio || '1:1',
      lora_weight: lora_weight ?? 0.8,
      seed,
    });

    const jobId = await submitJob(workflow);
    return NextResponse.json({ jobId });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error interno';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
