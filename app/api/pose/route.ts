import { NextRequest, NextResponse } from 'next/server';
import { submitJob } from '../../lib/runpod';
import { buildPoseWorkflow } from '../../lib/workflows';

export async function POST(req: NextRequest) {
  try {
    const { pose_image_url, prompt, lora_weight } = await req.json();
    if (!pose_image_url) return NextResponse.json({ error: 'pose_image_url requerido' }, { status: 400 });

    const workflow = buildPoseWorkflow({
      pose_image_url,
      prompt: prompt || '',
      lora_weight: lora_weight ?? 0.85,
    });
    const jobId = await submitJob(workflow);
    return NextResponse.json({ jobId });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error interno';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
