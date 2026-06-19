/**
 * RunPod Serverless client (self-hosted ComfyUI worker).
 * Used as the fallback NSFW-image provider (CyberRealistic Pony + LoRA + IP-Adapter)
 * and, later, for NSFW video (Wan 2.2) and NSFW motion (MimicMotion).
 */
import type { PollResult } from './types';

const RUNPOD_BASE = 'https://api.runpod.ai/v2';

export interface ComfyImageInput {
  name: string;        // filename inside ComfyUI input/ folder
  image: string;       // base64-encoded image data
}

function cfg() {
  const endpoint = process.env.RUNPOD_ENDPOINT_ID;
  const key = process.env.RUNPOD_API_KEY;
  if (!endpoint || !key) throw new Error('RUNPOD_ENDPOINT_ID o RUNPOD_API_KEY no configurados');
  return { endpoint, key };
}

/** Submit a raw ComfyUI graph. Returns the RunPod job id. */
export async function runpodSubmit(
  workflow: Record<string, unknown>,
  images?: ComfyImageInput[],
): Promise<string> {
  const { endpoint, key } = cfg();
  const body: Record<string, unknown> = { input: { workflow } };
  if (images?.length) (body.input as Record<string, unknown>).images = images;

  const res = await fetch(`${RUNPOD_BASE}/${endpoint}/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `RunPod error ${res.status}`);
  if (!data.id) throw new Error('RunPod no devolvió job ID');
  return data.id as string;
}

export async function runpodPoll(jobId: string): Promise<PollResult> {
  const { endpoint, key } = cfg();
  const res = await fetch(`${RUNPOD_BASE}/${endpoint}/status/${jobId}`, {
    headers: { Authorization: `Bearer ${key}` },
  });
  const job = await res.json();
  const s = (job.status || '').toUpperCase();

  if (s === 'COMPLETED') {
    const out = job.output;
    const images = out?.images || [];
    if (!images.length) return { status: 'failed', error: out?.message || 'Sin outputs' };
    const first = images[0];
    if (first.type === 's3_url' && first.data) return { status: 'completed', url: first.data };
    // base64 — caller (poll route) will push to R2
    if (first.type === 'base64' && first.data) {
      return { status: 'completed', url: `base64:${first.filename || 'out.png'}:${first.data}` };
    }
    return { status: 'failed', error: 'Formato de salida desconocido' };
  }
  if (s === 'FAILED' || s === 'CANCELLED') {
    const details = job.output?.details;
    const msg = Array.isArray(details) ? details.join(' ') : (job.error || job.output?.message || 'Job falló');
    return { status: 'failed', error: msg };
  }
  return { status: s === 'IN_PROGRESS' ? 'processing' : 'queued' };
}
