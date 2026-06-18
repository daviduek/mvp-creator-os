/**
 * Build ComfyUI workflow graphs ready to send to runpod/worker-comfyui.
 * The official worker expects { input: { workflow: <graph> } } where
 * <graph> is a ComfyUI API-format graph (the JSON exported via "Workflow > Export (API)").
 */

const TRIGGER = 'sashavan';
const LORA_NAME = 'sashavan.safetensors';
const SDXL_BASE = 'ponyDiffusionV6XL.safetensors';

// Pony XL responds best to its own tag-based prompt format.
// Score boosters drive quality up; source_photo nudges toward photorealism (Pony was trained on multi-style data).
const PONY_QUALITY_TAGS = 'score_9, score_8_up, score_7_up, source_photo, photorealistic, realistic photo';
const PONY_NEGATIVE = 'score_4, score_5, score_6, anime, cartoon, drawing, painting, illustration, sketch, 3d render, low quality, blurry, deformed, bad anatomy, extra limbs, watermark, logo';

function ensureTrigger(prompt: string): string {
  const hasTrigger = prompt.toLowerCase().includes(TRIGGER);
  const hasPonyTags = /score_\d/.test(prompt);
  const base = hasTrigger ? prompt : `${TRIGGER}, ${prompt}`;
  return hasPonyTags ? base : `${PONY_QUALITY_TAGS}, ${base}`;
}

function aspectToWH(ratio: string): [number, number] {
  const map: Record<string, [number, number]> = {
    '1:1': [1024, 1024],
    '16:9': [1344, 768],
    '9:16': [832, 1216],
    '4:3': [1152, 896],
    '3:4': [896, 1152],
  };
  return map[ratio] || [1024, 1024];
}

function randomSeed(): number {
  return Math.floor(Math.random() * 0x7fffffff);
}

/** Text → Image with LoRA */
export function buildT2IGraph(opts: {
  prompt: string;
  aspect_ratio: string;
  lora_weight: number;
  seed?: number;
}) {
  const [width, height] = aspectToWH(opts.aspect_ratio);
  const prompt = ensureTrigger(opts.prompt);
  const seed = opts.seed ?? randomSeed();
  return {
    '1': {
      class_type: 'CheckpointLoaderSimple',
      inputs: { ckpt_name: SDXL_BASE },
    },
    '10': {
      class_type: 'LoraLoader',
      inputs: {
        lora_name: LORA_NAME,
        strength_model: opts.lora_weight,
        strength_clip: opts.lora_weight,
        model: ['1', 0],
        clip: ['1', 1],
      },
    },
    '6': {
      class_type: 'CLIPTextEncode',
      inputs: { text: prompt, clip: ['10', 1] },
    },
    '7': {
      class_type: 'CLIPTextEncode',
      inputs: {
        text: PONY_NEGATIVE,
        clip: ['10', 1],
      },
    },
    '5': {
      class_type: 'EmptyLatentImage',
      inputs: { width, height, batch_size: 1 },
    },
    '3': {
      class_type: 'KSampler',
      inputs: {
        seed,
        steps: 30,
        cfg: 7,
        sampler_name: 'dpmpp_2m_sde',
        scheduler: 'karras',
        denoise: 1.0,
        model: ['10', 0],
        positive: ['6', 0],
        negative: ['7', 0],
        latent_image: ['5', 0],
      },
    },
    '8': {
      class_type: 'VAEDecode',
      inputs: { samples: ['3', 0], vae: ['1', 2] },
    },
    '9': {
      class_type: 'SaveImage',
      inputs: { filename_prefix: 'sasha_t2i', images: ['8', 0] },
    },
  };
}

/** Pose-copy via ControlNet OpenPose */
export function buildPoseGraph(opts: {
  pose_image_filename: string; // filename inside ComfyUI input/ folder
  prompt: string;
  lora_weight: number;
}) {
  const prompt = ensureTrigger(opts.prompt || 'photorealistic portrait');
  return {
    '1': { class_type: 'CheckpointLoaderSimple', inputs: { ckpt_name: SDXL_BASE } },
    '10': {
      class_type: 'LoraLoader',
      inputs: {
        lora_name: LORA_NAME,
        strength_model: opts.lora_weight,
        strength_clip: opts.lora_weight,
        model: ['1', 0],
        clip: ['1', 1],
      },
    },
    '20': { class_type: 'LoadImage', inputs: { image: opts.pose_image_filename } },
    '21': {
      class_type: 'OpenposePreprocessor',
      inputs: { image: ['20', 0], detect_hand: 'enable', detect_body: 'enable', detect_face: 'enable', resolution: 1024 },
    },
    '23': { class_type: 'ControlNetLoader', inputs: { control_net_name: 'controlnet-openpose-sdxl.safetensors' } },
    '6': { class_type: 'CLIPTextEncode', inputs: { text: prompt, clip: ['10', 1] } },
    '7': { class_type: 'CLIPTextEncode', inputs: { text: PONY_NEGATIVE, clip: ['10', 1] } },
    '22': {
      class_type: 'ControlNetApply',
      inputs: { strength: 0.9, conditioning: ['6', 0], control_net: ['23', 0], image: ['21', 0] },
    },
    '5': { class_type: 'EmptyLatentImage', inputs: { width: 1024, height: 1024, batch_size: 1 } },
    '3': {
      class_type: 'KSampler',
      inputs: {
        seed: randomSeed(),
        steps: 30, cfg: 7,
        sampler_name: 'dpmpp_2m_sde', scheduler: 'karras', denoise: 1.0,
        model: ['10', 0], positive: ['22', 0], negative: ['7', 0], latent_image: ['5', 0],
      },
    },
    '8': { class_type: 'VAEDecode', inputs: { samples: ['3', 0], vae: ['1', 2] } },
    '9': { class_type: 'SaveImage', inputs: { filename_prefix: 'sasha_pose', images: ['8', 0] } },
  };
}

// Video workflows kept as stubs — to be completed once we export real graphs from ComfyUI
// after installing the corresponding custom nodes (Wan2.1, HunyuanVideo, MimicMotion).
export function buildI2VGraph(_opts: { image_filename: string; prompt: string; resolution: string; duration: number }) {
  throw new Error('I2V workflow not yet exported from ComfyUI');
}
export function buildT2VGraph(_opts: { prompt: string; duration: number }) {
  throw new Error('T2V workflow not yet exported from ComfyUI');
}
export function buildMotionGraph(_opts: { sasha_image_filename: string; ref_video_filename: string }) {
  throw new Error('Motion workflow not yet exported from ComfyUI');
}
