import { NextRequest, NextResponse } from 'next/server';
import { submitGraph, ComfyImageInput } from '../../lib/runpod';
import { buildPoseGraph } from '../../lib/workflows';

export async function POST(req: NextRequest) {
  try {
    const { pose_image_url, pose_image_base64, prompt, lora_weight } = await req.json();
    if (!pose_image_url && !pose_image_base64) {
      return NextResponse.json({ error: 'pose_image_url o pose_image_base64 requerido' }, { status: 400 });
    }

    let images: ComfyImageInput[] | undefined;
    let filename = 'pose_ref.png';

    if (pose_image_base64) {
      const b64 = pose_image_base64.includes(',') ? pose_image_base64.split(',')[1] : pose_image_base64;
      images = [{ name: filename, image: b64 }];
    } else {
      // Fetch the image from URL and convert to base64 to send through the official handler
      const res = await fetch(pose_image_url);
      if (!res.ok) throw new Error(`No se pudo bajar la pose ref (${res.status})`);
      const buf = Buffer.from(await res.arrayBuffer());
      images = [{ name: filename, image: buf.toString('base64') }];
    }

    const graph = buildPoseGraph({
      pose_image_filename: filename,
      prompt: prompt || '',
      lora_weight: lora_weight ?? 0.85,
    });

    const jobId = await submitGraph(graph, images);
    return NextResponse.json({ jobId });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error interno';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
