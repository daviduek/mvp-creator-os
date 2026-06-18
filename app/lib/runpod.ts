/**
 * Client for the runpod/worker-comfyui Serverless endpoint.
 * Input format: { input: { workflow: <ComfyUI graph>, images?: [{name, image: base64}] } }
 * Output format: { output: { images: [{filename, type: "base64"|"s3_url", data}] } } or similar
 */

const RUNPOD_BASE = 'https://api.runpod.ai/v2';

export interface ComfyImageInput {
  name: string;        // filename inside ComfyUI input/ folder
  image: string;       // base64-encoded image data
}

export interface RunPodJobOutput {
  message?: string;
  images?: Array<{ filename?: string; type?: 'base64' | 's3_url'; data?: string }>;
  errors?: string[];
}

export interface RunPodJobStatus {
  id: string;
  status: 'IN_QUEUE' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  output?: RunPodJobOutput;
  error?: string;
}

function getConfig() {
  const endpoint = process.env.RUNPOD_ENDPOINT_ID;
  const key = process.env.RUNPOD_API_KEY;
  if (!endpoint || !key) throw new Error('RUNPOD_ENDPOINT_ID o RUNPOD_API_KEY no configurados');
  return { endpoint, key };
}

export async function submitGraph(
  workflow: Record<string, unknown>,
  images?: ComfyImageInput[]
): Promise<string> {
  const { endpoint, key } = getConfig();
  const body: Record<string, unknown> = { input: { workflow } };
  if (images && images.length) (body.input as Record<string, unknown>).images = images;

  const res = await fetch(`${RUNPOD_BASE}/${endpoint}/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `RunPod error ${res.status}`);
  if (!data.id) throw new Error('RunPod no devolvió job ID');
  return data.id;
}

export async function getJob(jobId: string): Promise<RunPodJobStatus> {
  const { endpoint, key } = getConfig();
  const res = await fetch(`${RUNPOD_BASE}/${endpoint}/status/${jobId}`, {
    headers: { Authorization: `Bearer ${key}` },
  });
  return res.json();
}
