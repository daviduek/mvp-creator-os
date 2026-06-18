# Start from RunPod's official ComfyUI worker, base variant (no models).
FROM runpod/worker-comfyui:5.5.0-base

# Pre-bake everything we need so workers start with zero downloads.
# Sasha LoRA (~870MB)
RUN mkdir -p /comfyui/models/loras \
 && wget -q -O /comfyui/models/loras/sashavan.safetensors \
    "https://pub-59a7dc0002a9480faf4f6cb09c2bfd5e.r2.dev/loras/sashavan.safetensors" \
 && ls -lh /comfyui/models/loras/sashavan.safetensors

# SDXL base checkpoint (~6.5GB)
RUN mkdir -p /comfyui/models/checkpoints \
 && wget -q -O /comfyui/models/checkpoints/sd_xl_base_1.0.safetensors \
    "https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0/resolve/main/sd_xl_base_1.0.safetensors" \
 && ls -lh /comfyui/models/checkpoints/sd_xl_base_1.0.safetensors

# SDXL VAE fp16 fix (~330MB) for cleaner outputs
RUN mkdir -p /comfyui/models/vae \
 && wget -q -O /comfyui/models/vae/sdxl_vae.safetensors \
    "https://huggingface.co/madebyollin/sdxl-vae-fp16-fix/resolve/main/sdxl_vae.safetensors" \
 && ls -lh /comfyui/models/vae/sdxl_vae.safetensors

# ControlNet OpenPose is large (~2.5GB) and only needed for Pose mode.
# Skip baking it; the Pose route will lazy-download it on first use.

# Inherit CMD/ENTRYPOINT from base — no overrides.
