/**
 * Build provider-specific input JSON from a normalized GenRequest.
 *
 * IMPORTANT — identity preservation:
 *   API models (Imagen 4, Veo 3, base Flux) do NOT know who Sasha is. To keep her
 *   face we route image generation through identity-preserving models that accept a
 *   reference image (PuLID / IP-Adapter-FaceID style). The canonical face ref lives
 *   in R2 and is passed as `reference_image_url`.
 *
 *   Models that ignore reference images will just produce a generic person — that's
 *   fine for backgrounds/scene tests but not for Sasha content.
 */
import type { GenRequest } from './types';

const DEFAULT_FACE_REF =
  process.env.SASHA_FACE_REF ||
  'https://pub-59a7dc0002a9480faf4f6cb09c2bfd5e.r2.dev/face_refs/sasha_canon_01.png';

/** Map our aspect ratios to the strings fal/replicate expect. */
function aspect(req: GenRequest): string {
  return req.aspect_ratio || '1:1';
}

/** Imagen-style image_size enum some fal models want instead of aspect_ratio. */
function imageSize(req: GenRequest): string {
  const map: Record<string, string> = {
    '1:1': 'square_hd',
    '16:9': 'landscape_16_9',
    '9:16': 'portrait_16_9',
    '4:3': 'landscape_4_3',
    '3:4': 'portrait_4_3',
  };
  return map[req.aspect_ratio || '1:1'] || 'square_hd';
}

/** Build input for a fal model. The model id determines which knobs matter; we
 *  send a superset of common fields and let fal ignore the rest. */
export function buildFalInput(model: string, req: GenRequest): Record<string, unknown> {
  const base: Record<string, unknown> = {
    prompt: req.prompt || '',
  };

  // Identity-preserving image models (PuLID / face-id).
  // IMPORTANT: pass the canon face ONLY as the identity reference. Do NOT pass it as
  // image_url — that makes flux-pulid treat it as an init/img2img base and reproduce
  // the same frontal pose every time, ignoring the prompt.
  if (/pulid|face.?id|ip.?adapter|instantid|photomaker/i.test(model)) {
    base.reference_image_url = DEFAULT_FACE_REF;
    base.image_size = imageSize(req);
    base.num_images = 1;

    // Lighter realism cues (heavy suffixes were also flattening pose/expression).
    const realismSuffix = 'natural skin texture, visible pores, soft natural lighting, film grain, candid';
    base.prompt = `${base.prompt}, ${realismSuffix}`;

    base.negative_prompt =
      'airbrushed, smooth plastic skin, cgi, 3d render, cartoon, illustration, painting, ' +
      'overprocessed, waxy skin, doll-like, AI look, beauty filter';

    base.guidance_scale = Number(process.env.FAL_PULID_GUIDANCE || 3.5);
    base.num_inference_steps = Number(process.env.FAL_PULID_STEPS || 28);
    base.true_cfg = Number(process.env.FAL_PULID_TRUE_CFG || 1);
    // id_weight lower (0.8) → keeps Sasha's face but lets the PROMPT drive pose/expression.
    base.id_weight = Number(process.env.FAL_PULID_ID_WEIGHT || 0.8);
    // PuLID only on later steps → early steps set composition from the prompt.
    base.start_step = Number(process.env.FAL_PULID_START_STEP || 1);
    if (req.seed != null) base.seed = req.seed;
    return base;
  }

  // Veo / video models
  if (/veo|kling|runway|luma|minimax|video/i.test(model)) {
    base.aspect_ratio = aspect(req) === '9:16' ? '9:16' : '16:9';
    if (req.duration) base.duration = `${req.duration}s`;
    if (req.image_url) base.image_url = req.image_url;     // i2v / animate
    if (req.ref_video_url) base.video_url = req.ref_video_url; // motion ref
    return base;
  }

  // Plain image models (Imagen 4, base Flux). No identity.
  base.aspect_ratio = aspect(req);
  base.image_size = imageSize(req);
  base.num_images = 1;
  if (req.image_url) base.image_url = req.image_url;
  return base;
}

/** Build input for a Replicate model. */
export function buildReplicateInput(model: string, req: GenRequest): Record<string, unknown> {
  const base: Record<string, unknown> = {
    prompt: req.prompt || '',
    aspect_ratio: aspect(req),
    num_outputs: 1,
    output_format: 'png',
  };
  // Face/identity models
  if (/pulid|face|instantid|photomaker|ip.?adapter/i.test(model)) {
    base.face_image = DEFAULT_FACE_REF;
    base.image = DEFAULT_FACE_REF;
  }
  if (req.image_url) base.image = req.image_url;
  if (req.seed != null) base.seed = req.seed;
  return base;
}
