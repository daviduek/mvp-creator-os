/**
 * fal.ai queue client.
 *
 * Submit:  POST https://queue.fal.run/{model}      -> { request_id, status_url, response_url }
 * Status:  GET  {status_url}                        -> { status: IN_QUEUE|IN_PROGRESS|COMPLETED }
 * Result:  GET  {response_url}                       -> model output JSON
 *
 * Auth header: `Authorization: Key {FAL_KEY}`
 */
import type { PollResult } from './types';

const QUEUE_BASE = 'https://queue.fal.run';

function key(): string {
  const k = process.env.FAL_KEY;
  if (!k) throw new Error('FAL_KEY no configurada');
  return k;
}

export interface FalSubmitResult {
  requestId: string;
  statusUrl: string;    // authoritative URLs returned by fal — robust for sub-pathed models
  responseUrl: string;
}

/** Submit a job to fal. Returns fal's own status/response URLs (don't reconstruct them!). */
export async function falSubmit(model: string, input: Record<string, unknown>): Promise<FalSubmitResult> {
  const res = await fetch(`${QUEUE_BASE}/${model}`, {
    method: 'POST',
    headers: { Authorization: `Key ${key()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.detail || data?.error || `fal error ${res.status}`);
  }
  if (!data.request_id) throw new Error('fal no devolvió request_id');

  // fal returns the exact URLs to poll. The status URL for sub-pathed models
  // (e.g. fal-ai/veo3/image-to-video) lives under the base app id, so we must
  // use what fal hands back rather than building it ourselves.
  const appBase = model.split('/').slice(0, 2).join('/'); // fal-ai/veo3
  return {
    requestId: data.request_id,
    statusUrl: data.status_url || `${QUEUE_BASE}/${appBase}/requests/${data.request_id}/status`,
    responseUrl: data.response_url || `${QUEUE_BASE}/${appBase}/requests/${data.request_id}`,
  };
}

/** Poll a fal job using fal's own status/response URLs. */
export async function falPoll(statusUrl: string, responseUrl: string): Promise<PollResult> {
  const statusRes = await fetch(statusUrl, { headers: { Authorization: `Key ${key()}` } });
  if (!statusRes.ok) {
    const t = await statusRes.text();
    return { status: 'failed', error: `fal status ${statusRes.status}: ${t.slice(0, 200)}` };
  }
  const status = await statusRes.json();
  const s = (status.status || '').toUpperCase();

  if (s === 'IN_QUEUE') return { status: 'queued' };
  if (s === 'IN_PROGRESS') return { status: 'processing', progress: status.progress };
  if (s !== 'COMPLETED') return { status: 'processing' };

  const resultRes = await fetch(responseUrl, { headers: { Authorization: `Key ${key()}` } });
  const result = await resultRes.json();
  if (!resultRes.ok) {
    return { status: 'failed', error: result?.detail || `fal result ${resultRes.status}` };
  }

  const url = extractFalUrl(result);
  if (!url) return { status: 'failed', error: 'fal no devolvió URL de salida' };
  return { status: 'completed', url };
}

/** fal output shapes vary by model; dig the first media URL out. */
function extractFalUrl(result: Record<string, unknown>): string | undefined {
  // images: [{ url }]
  const images = result.images as Array<{ url?: string }> | undefined;
  if (images?.[0]?.url) return images[0].url;
  // image: { url }
  const image = result.image as { url?: string } | undefined;
  if (image?.url) return image.url;
  // video: { url }
  const video = result.video as { url?: string } | undefined;
  if (video?.url) return video.url;
  // videos: [{ url }]
  const videos = result.videos as Array<{ url?: string }> | undefined;
  if (videos?.[0]?.url) return videos[0].url;
  // some models nest under output / data
  for (const k of ['output', 'data', 'result']) {
    const nested = result[k] as Record<string, unknown> | undefined;
    if (nested) {
      const u = extractFalUrl(nested);
      if (u) return u;
    }
  }
  return undefined;
}
