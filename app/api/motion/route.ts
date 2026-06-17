import { NextRequest, NextResponse } from 'next/server';
import { submitJob } from '../../lib/runpod';
import { buildMotionWorkflow } from '../../lib/workflows';

export async function POST(req: NextRequest) {
  try {
    const { sasha_image_url, ref_video_url, tiktok_url } = await req.json();
    if (!sasha_image_url) return NextResponse.json({ error: 'sasha_image_url requerido' }, { status: 400 });
    if (!ref_video_url && !tiktok_url) return NextResponse.json({ error: 'Necesito video o link TikTok' }, { status: 400 });

    const workflow = buildMotionWorkflow({ sasha_image_url, ref_video_url, tiktok_url });
    const jobId = await submitJob(workflow);
    return NextResponse.json({ jobId });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error interno';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
