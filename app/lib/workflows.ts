/**
 * Build ComfyUI workflow graphs ready to send to runpod/worker-comfyui.
 * The official worker expects { input: { workflow: <graph> } } where
 * <graph> is a ComfyUI API-format graph (the JSON exported via "Workflow > Export (API)").
 */

const TRIGGER = 'sashavan';
const LORA_NAME = 'sashavan_pony.safetensors';
const SDXL_BASE = 'cyberrealisticPony.safetensors';

// CyberRealistic Pony is Pony family → uses Pony's tag format.
// Score boosters drive quality; source_photo + photorealistic nudge away from stylization.
const PONY_QUALITY_TAGS = 'score_9, score_8_up, score_7_up, source_photo, photorealistic, raw photo, dslr photo';
const SDXL_NEGATIVE = 'score_4, score_5, score_6, anime, cartoon, drawing, painting, illustration, sketch, 3d render, low quality, blurry, deformed, bad anatomy, extra limbs, extra fingers, watermark, logo, text, plastic skin';

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

/** Text → Image with LoRA + IP-Adapter FaceID Plus v2 + Face Detailer */
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
    // === Base model + character LoRA ===
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

    // === IP-Adapter FaceID Plus v2 — lock identity from canon refs ===
    '30': {
      class_type: 'IPAdapterUnifiedLoader',
      inputs: { preset: 'FACEID PLUS V2', model: ['10', 0] },
    },
    '31': { class_type: 'LoadImage', inputs: { image: 'face_refs/sasha_canon_01.png' } },
    '32': { class_type: 'LoadImage', inputs: { image: 'face_refs/sasha_canon_02.png' } },
    '33': { class_type: 'LoadImage', inputs: { image: 'face_refs/sasha_canon_03.png' } },
    '34': { class_type: 'LoadImage', inputs: { image: 'face_refs/sasha_canon_04.png' } },
    '35': { class_type: 'LoadImage', inputs: { image: 'face_refs/sasha_canon_05.png' } },
    '36': {
      class_type: 'IPAdapterFaceID',
      inputs: {
        model: ['30', 0],
        ipadapter: ['30', 1],
        image: ['31', 0],
        image_2: ['32', 0],
        image_3: ['33', 0],
        image_4: ['34', 0],
        image_5: ['35', 0],
        weight: 0.85,
        weight_faceidv2: 1.5,
        weight_type: 'linear',
        start_at: 0,
        end_at: 1,
        embeds_scaling: 'V only',
        insightface: ['30', 2],
      },
    },

    // === Prompts ===
    '6': { class_type: 'CLIPTextEncode', inputs: { text: prompt, clip: ['10', 1] } },
    '7': { class_type: 'CLIPTextEncode', inputs: { text: SDXL_NEGATIVE, clip: ['10', 1] } },

    // === Pass 1: full image ===
    '5': { class_type: 'EmptyLatentImage', inputs: { width, height, batch_size: 1 } },
    '3': {
      class_type: 'KSampler',
      inputs: {
        seed,
        steps: 30,
        cfg: 6.5,
        sampler_name: 'dpmpp_2m_sde',
        scheduler: 'karras',
        denoise: 1.0,
        model: ['36', 0],            // <-- model after IP-Adapter
        positive: ['6', 0],
        negative: ['7', 0],
        latent_image: ['5', 0],
      },
    },
    '8': { class_type: 'VAEDecode', inputs: { samples: ['3', 0], vae: ['1', 2] } },

    // === Pass 2: face detailer — regenerate face area with full LoRA weight ===
    '40': {
      class_type: 'UltralyticsDetectorProvider',
      inputs: { model_name: 'bbox/face_yolov8m.pt' },
    },
    '41': {
      class_type: 'FaceDetailer',
      inputs: {
        image: ['8', 0],
        model: ['36', 0],            // IP-Adapter modulated model
        clip: ['10', 1],
        vae: ['1', 2],
        positive: ['6', 0],
        negative: ['7', 0],
        bbox_detector: ['40', 0],
        guide_size: 384,
        guide_size_for: true,
        max_size: 1024,
        seed: seed + 1,
        steps: 25,
        cfg: 6.5,
        sampler_name: 'dpmpp_2m_sde',
        scheduler: 'karras',
        denoise: 0.45,
        feather: 5,
        noise_mask: true,
        force_inpaint: true,
        bbox_threshold: 0.5,
        bbox_dilation: 10,
        bbox_crop_factor: 3.0,
        sam_detection_hint: 'center-1',
        sam_dilation: 0,
        sam_threshold: 0.93,
        sam_bbox_expansion: 0,
        sam_mask_hint_threshold: 0.7,
        sam_mask_hint_use_negative: 'False',
        drop_size: 10,
        wildcard: '',
        cycle: 1,
        inpaint_model: false,
        noise_mask_feather: 20,
      },
    },

    // === Save ===
    '9': { class_type: 'SaveImage', inputs: { filename_prefix: 'sasha_t2i', images: ['41', 0] } },
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
    '7': { class_type: 'CLIPTextEncode', inputs: { text: SDXL_NEGATIVE, clip: ['10', 1] } },
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
