/**
 * Server-side router. Resolves the concrete provider + model for a request,
 * submits it, and returns an opaque jobId token the client polls.
 *
 * Model ids are read from env vars (with defaults) so you can swap models
 * without code changes. See SETUP.md for the full list.
 */
import type { GenRequest, SubmitResult, PollResult, ProviderName } from './types';
import { ROUTE_INFO, routeKey } from './routes';
import { falSubmit, falPoll } from './fal';
import { replicateSubmit, replicatePoll } from './replicate';
import { runpodSubmit, runpodPoll, ComfyImageInput } from './runpod';
import { buildFalInput, buildReplicateInput } from './inputs';
import { buildT2IGraph, buildPoseGraph } from '../workflows';

/** Env overrides for model ids, keyed by `${mode}:${content}`. */
const MODEL_ENV: Record<string, string | undefined> = {
  't2i:sfw': process.env.FAL_MODEL_T2I_SFW || 'fal-ai/flux-pulid',
  't2i:nsfw': process.env.REPLICATE_MODEL_T2I_NSFW, // unset → falls back to runpod infra
  't2v:sfw': process.env.FAL_MODEL_T2V_SFW || 'fal-ai/veo3',
  'i2v:sfw': process.env.FAL_MODEL_I2V_SFW || 'fal-ai/veo3/image-to-video',
  'motion:sfw': process.env.FAL_MODEL_MOTION_SFW || 'fal-ai/runway-gen4/turbo/image-to-video',
};

interface Resolved {
  provider: ProviderName;
  model?: string;
}

/** Decide provider + model for a request. */
function resolve(req: GenRequest): Resolved {
  const k = routeKey(req.mode, req.content);
  const info = ROUTE_INFO[k];
  if (!info) throw new Error(`Combinación no soportada: ${k}`);
  if (!info.enabled && info.provider !== 'runpod') {
    throw new Error(`${info.label} todavía no está disponible. ${info.note || ''}`.trim());
  }

  const model = MODEL_ENV[k];

  // NSFW image: prefer Replicate model if configured, else self-hosted infra (Sasha identity).
  if (k === 't2i:nsfw') {
    if (model) return { provider: 'replicate', model };
    return { provider: 'runpod' };
  }

  return { provider: info.provider, model };
}

/** Encode an opaque, URL-safe job token. */
function encodeToken(provider: ProviderName, model: string | undefined, id: string): string {
  const json = JSON.stringify({ p: provider, m: model, id });
  return Buffer.from(json, 'utf8').toString('base64url');
}

function decodeToken(token: string): { p: ProviderName; m?: string; id: string } {
  const json = Buffer.from(token, 'base64url').toString('utf8');
  return JSON.parse(json);
}

/** Submit a generation request. Returns a jobId to poll. */
export async function submit(req: GenRequest): Promise<SubmitResult> {
  const { provider, model } = resolve(req);

  if (provider === 'fal') {
    if (!model) throw new Error('Modelo fal no configurado');
    const input = buildFalInput(model, req);
    const id = await falSubmit(model, input);
    return { jobId: encodeToken('fal', model, id) };
  }

  if (provider === 'replicate') {
    if (!model) throw new Error('Modelo Replicate no configurado');
    const input = buildReplicateInput(model, req);
    const id = await replicateSubmit(model, input);
    return { jobId: encodeToken('replicate', model, id) };
  }

  // runpod — self-hosted ComfyUI graphs
  if (req.mode === 't2i') {
    const graph = buildT2IGraph({
      prompt: req.prompt || '',
      aspect_ratio: req.aspect_ratio || '1:1',
      lora_weight: req.lora_weight ?? 0.85,
      seed: req.seed,
    });
    const id = await runpodSubmit(graph);
    return { jobId: encodeToken('runpod', undefined, id) };
  }

  if (req.mode === 'pose') {
    if (!req.image_url) throw new Error('Falta pose_image_url');
    const filename = 'pose_ref.png';
    const r = await fetch(req.image_url);
    if (!r.ok) throw new Error(`No se pudo bajar la pose ref (${r.status})`);
    const buf = Buffer.from(await r.arrayBuffer());
    const images: ComfyImageInput[] = [{ name: filename, image: buf.toString('base64') }];
    const graph = buildPoseGraph({
      pose_image_filename: filename,
      prompt: req.prompt || '',
      lora_weight: req.lora_weight ?? 0.85,
    });
    const id = await runpodSubmit(graph, images);
    return { jobId: encodeToken('runpod', undefined, id) };
  }

  throw new Error(`Modo ${req.mode} en infra propia todavía no implementado`);
}

/** Poll a job by its opaque token. */
export async function poll(token: string): Promise<PollResult> {
  let decoded;
  try {
    decoded = decodeToken(token);
  } catch {
    return { status: 'failed', error: 'jobId inválido' };
  }
  if (decoded.p === 'fal') return falPoll(decoded.m!, decoded.id);
  if (decoded.p === 'replicate') return replicatePoll(decoded.id);
  if (decoded.p === 'runpod') return runpodPoll(decoded.id);
  return { status: 'failed', error: 'Proveedor desconocido' };
}
