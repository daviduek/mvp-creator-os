const LORA_URL = process.env.SASHA_LORA_URL || 'sashavan.safetensors';
const TRIGGER = 'sashavan';

function ensureTrigger(prompt: string): string {
  return prompt.toLowerCase().includes(TRIGGER) ? prompt : `${TRIGGER}, ${prompt}`;
}

function aspectToWH(ratio: string): [number, number] {
  const map: Record<string, [number, number]> = {
    '1:1': [1024, 1024],
    '16:9': [1344, 768],
    '9:16': [768, 1344],
    '4:3': [1152, 896],
    '3:4': [896, 1152],
  };
  return map[ratio] || [1024, 1024];
}

export function buildT2IWorkflow(opts: { prompt: string; aspect_ratio: string; lora_weight: number; seed?: number }) {
  const [width, height] = aspectToWH(opts.aspect_ratio);
  const prompt = ensureTrigger(opts.prompt);
  return {
    type: 't2i',
    base_model: 'sd_xl_base_1.0.safetensors',
    lora: { url: LORA_URL, weight: opts.lora_weight },
    prompt,
    negative_prompt: 'lowres, blurry, deformed, bad anatomy, extra limbs, watermark',
    width, height,
    steps: 30,
    cfg: 7,
    sampler: 'dpmpp_2m_sde',
    scheduler: 'karras',
    seed: opts.seed ?? -1,
  };
}

export function buildI2VWorkflow(opts: { image_url: string; prompt: string; resolution: string; duration: number }) {
  const fps = 16;
  return {
    type: 'i2v',
    model: 'wan2.1_i2v.safetensors',
    image_url: opts.image_url,
    prompt: opts.prompt || 'gentle natural motion',
    resolution: opts.resolution,
    frames: opts.duration * fps,
    fps,
    steps: 25,
    cfg: 6,
  };
}

export function buildT2VWorkflow(opts: { prompt: string; duration: number }) {
  const fps = 16;
  const prompt = ensureTrigger(opts.prompt);
  return {
    type: 't2v',
    model: 'hunyuan_video.safetensors',
    lora: { url: LORA_URL, weight: 0.8 },
    prompt,
    frames: opts.duration * fps,
    fps,
    width: 768,
    height: 1344,
    steps: 30,
    cfg: 7,
  };
}

export function buildMotionWorkflow(opts: { sasha_image_url: string; ref_video_url?: string; tiktok_url?: string }) {
  return {
    type: 'motion',
    model: 'mimicmotion.safetensors',
    reference_image_url: opts.sasha_image_url,
    motion_source: opts.ref_video_url
      ? { type: 'url', url: opts.ref_video_url }
      : { type: 'tiktok', url: opts.tiktok_url },
    pose_extractor: 'dwpose',
    steps: 25,
    fps: 16,
    max_duration_seconds: 10,
  };
}

export function buildPoseWorkflow(opts: { pose_image_url: string; prompt: string; lora_weight: number }) {
  const prompt = ensureTrigger(opts.prompt || 'photorealistic portrait');
  return {
    type: 'pose',
    base_model: 'sd_xl_base_1.0.safetensors',
    lora: { url: LORA_URL, weight: opts.lora_weight },
    controlnet: { type: 'openpose', image_url: opts.pose_image_url, weight: 0.9 },
    prompt,
    negative_prompt: 'lowres, blurry, deformed, bad anatomy, watermark',
    width: 1024,
    height: 1024,
    steps: 30,
    cfg: 7,
    sampler: 'dpmpp_2m_sde',
    scheduler: 'karras',
  };
}
