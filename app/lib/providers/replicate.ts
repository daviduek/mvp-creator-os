/**
 * Replicate client.
 *
 * Submit: POST https://api.replicate.com/v1/predictions
 *         body { version | model, input }              -> { id, urls.get }
 * Status: GET  https://api.replicate.com/v1/predictions/{id}
 *         -> { status: starting|processing|succeeded|failed|canceled, output }
 *
 * Auth header: `Authorization: Bearer {REPLICATE_API_TOKEN}`
 *
 * We use the "model" field (owner/name) with implicit latest version when the
 * model id has no ':'; otherwise we split owner/name:version into version.
 */
import type { PollResult } from './types';

const BASE = 'https://api.replicate.com/v1';

function token(): string {
  const t = process.env.REPLICATE_API_TOKEN;
  if (!t) throw new Error('REPLICATE_API_TOKEN no configurado');
  return t;
}

/** model can be "owner/name" (latest) or "owner/name:versionhash". */
export async function replicateSubmit(model: string, input: Record<string, unknown>): Promise<string> {
  let body: Record<string, unknown>;
  if (model.includes(':')) {
    const version = model.split(':')[1];
    body = { version, input };
  } else {
    // Use the model-scoped endpoint for "owner/name"
    body = { input };
  }

  const endpoint = model.includes(':')
    ? `${BASE}/predictions`
    : `${BASE}/models/${model}/predictions`;

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token()}`,
      'Content-Type': 'application/json',
      Prefer: 'wait=0',
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.detail || data?.error || `Replicate error ${res.status}`);
  }
  if (!data.id) throw new Error('Replicate no devolvió prediction id');
  return data.id as string;
}

export async function replicatePoll(predictionId: string): Promise<PollResult> {
  const res = await fetch(`${BASE}/predictions/${predictionId}`, {
    headers: { Authorization: `Bearer ${token()}` },
  });
  const data = await res.json();
  if (!res.ok) {
    return { status: 'failed', error: data?.detail || `Replicate ${res.status}` };
  }
  const s = (data.status || '').toLowerCase();
  if (s === 'starting') return { status: 'queued' };
  if (s === 'processing') return { status: 'processing' };
  if (s === 'failed' || s === 'canceled') {
    return { status: 'failed', error: data.error || `Predicción ${s}` };
  }
  if (s === 'succeeded') {
    const url = extractReplicateUrl(data.output);
    if (!url) return { status: 'failed', error: 'Replicate no devolvió URL' };
    return { status: 'completed', url };
  }
  return { status: 'processing' };
}

/** Replicate output is usually a string URL or an array of string URLs. */
function extractReplicateUrl(output: unknown): string | undefined {
  if (!output) return undefined;
  if (typeof output === 'string') return output;
  if (Array.isArray(output)) {
    const first = output[0];
    if (typeof first === 'string') return first;
    if (first && typeof first === 'object' && 'url' in first) return (first as { url: string }).url;
  }
  if (typeof output === 'object' && 'url' in (output as object)) {
    return (output as { url: string }).url;
  }
  return undefined;
}
