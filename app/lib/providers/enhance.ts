/**
 * Photographic upscaler / realism pass via fal Clarity Upscaler.
 *
 * Runs synchronously (fal.run, not the queue) because it's fast (~10-20s) and
 * fits inside Vercel's 60s function budget. Adds real skin texture / micro-detail
 * while preserving identity (low creativity, high resemblance).
 */
const SYNC_BASE = 'https://fal.run';

function key(): string {
  const k = process.env.FAL_KEY;
  if (!k) throw new Error('FAL_KEY no configurada');
  return k;
}

const UPSCALE_MODEL = process.env.FAL_UPSCALE_MODEL || 'fal-ai/clarity-upscaler';

/** Returns an enhanced image URL, or the original on any failure (never throws). */
export async function enhanceImage(imageUrl: string): Promise<string> {
  if (process.env.ENHANCE_UPSCALE === '0') return imageUrl;
  try {
    const input = {
      image_url: imageUrl,
      prompt: 'natural skin texture with visible pores, fine detail, realistic photograph, film grain',
      upscale_factor: Number(process.env.FAL_UPSCALE_FACTOR || 2),
      // Low creativity + high resemblance = add texture WITHOUT changing the face.
      creativity: Number(process.env.FAL_UPSCALE_CREATIVITY || 0.25),
      resemblance: Number(process.env.FAL_UPSCALE_RESEMBLANCE || 0.85),
      num_inference_steps: Number(process.env.FAL_UPSCALE_STEPS || 18),
      negative_prompt: 'airbrushed, plastic skin, cgi, cartoon, oversmooth, waxy',
    };
    const res = await fetch(`${SYNC_BASE}/${UPSCALE_MODEL}`, {
      method: 'POST',
      headers: { Authorization: `Key ${key()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!res.ok) return imageUrl;
    const data = await res.json();
    const url =
      data?.image?.url ||
      data?.images?.[0]?.url ||
      (typeof data?.image === 'string' ? data.image : undefined);
    return url || imageUrl;
  } catch {
    return imageUrl;
  }
}

/** True for image URLs we should upscale (skip videos). */
export function isImageUrl(url: string): boolean {
  return /\.(png|jpe?g|webp)(\?|$)/i.test(url) || url.startsWith('base64:');
}
