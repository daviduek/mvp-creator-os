const RUNPOD_BASE = 'https://api.runpod.ai/v2';

export interface RunPodJob {
  id: string;
  status: 'IN_QUEUE' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  output?: { images?: string[]; videos?: string[]; url?: string; message?: string };
  error?: string;
}

export async function submitJob(workflow: Record<string, unknown>): Promise<string> {
  const endpoint = process.env.RUNPOD_ENDPOINT_ID;
  const key = process.env.RUNPOD_API_KEY;
  if (!endpoint || !key) throw new Error('RUNPOD_ENDPOINT_ID o RUNPOD_API_KEY no configurados');

  const res = await fetch(`${RUNPOD_BASE}/${endpoint}/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({ input: { workflow } }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `RunPod error ${res.status}`);
  if (!data.id) throw new Error('RunPod no devolvió job ID');
  return data.id;
}

export async function getJob(jobId: string): Promise<RunPodJob> {
  const endpoint = process.env.RUNPOD_ENDPOINT_ID;
  const key = process.env.RUNPOD_API_KEY;
  if (!endpoint || !key) throw new Error('RUNPOD config faltante');

  const res = await fetch(`${RUNPOD_BASE}/${endpoint}/status/${jobId}`, {
    headers: { Authorization: `Bearer ${key}` },
  });
  const data = await res.json();
  return data;
}
