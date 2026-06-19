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

/** Submit a job to fal. Returns the request_id (we also need the model to poll). */
export async function falSubmit(model: string, input: Record<string, unknown>): Promise<string> {
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
  return data.request_id as string;
}

/** Poll a fal job by model + request_id. */
export async function falPoll(model: string, requestId: string): Promise<PollResult> {
  const statusRes = await fetch(`${QUEUE_BASE}/${model}/requests/${requestId}/status`, {
    headers: { Authorization: `Key ${key()}` },
  });
  if (!statusRes.ok) {
    const t = await statusRes.text();
    return { status: 'failed', error: `fal status ${statusRes.status}: ${t.slice(0, 200)}` };
  }
  const status = await statusRes.json();
  const s = (status.status || '').toUpperCase();

  if (s === 'IN_QUEUE') return { status: 'queued' };
  if (s === 'IN_PROGRESS') return { status: 'processing', progress: status.progress };
  if (s !== 'COMPLETED') return { status: 'processing' };

  // Completed — fetch the actual result payload
  const resultRes = await fetch(`${QUEUE_BASE}/${model}/requests/${requestId}`, {
    headers: { Authorization: `Key ${key()}` },
  });
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
