import { NextRequest, NextResponse } from 'next/server';
import { submit } from '../../lib/providers/router';
import type { GenRequest } from '../../lib/providers/types';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const genReq: GenRequest = {
      mode: body.mode || 't2i',
      content: body.content === 'nsfw' ? 'nsfw' : 'sfw',
      prompt: body.prompt,
      aspect_ratio: body.aspect_ratio,
      duration: body.duration,
      resolution: body.resolution,
      image_url: body.image_url,
      end_image_url: body.end_image_url,
      ref_video_url: body.ref_video_url,
      tiktok_url: body.tiktok_url,
      lora_weight: body.lora_weight,
      denoise: body.denoise,
      seed: body.seed,
    };

    if (genReq.mode === 't2i' && !genReq.prompt?.trim()) {
      return NextResponse.json({ error: 'Prompt requerido' }, { status: 400 });
    }

    const result = await submit(genReq);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error interno';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
