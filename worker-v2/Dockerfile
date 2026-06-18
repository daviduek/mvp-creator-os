# Start from RunPod's official ComfyUI worker, base variant (no models).
FROM runpod/worker-comfyui:5.5.0-base

# Pre-bake everything we need so workers start with zero downloads.
# Sasha LoRA (~870MB)
RUN mkdir -p /comfyui/models/loras \
 && wget -q -O /comfyui/models/loras/sashavan.safetensors \
    "https://pub-59a7dc0002a9480faf4f6cb09c2bfd5e.r2.dev/loras/sashavan.safetensors" \
 && ls -lh /comfyui/models/loras/sashavan.safetensors

# Pony Diffusion V6 XL — SDXL fine-tune trained without the SDXL safety bias.
# AstraliteHeart's original repo. ~6.9GB.
RUN mkdir -p /comfyui/models/checkpoints \
 && wget -q -O /comfyui/models/checkpoints/ponyDiffusionV6XL.safetensors \
    "https://huggingface.co/AstraliteHeart/pony-diffusion-v6/resolve/main/v6.safetensors" \
 && ls -lh /comfyui/models/checkpoints/ponyDiffusionV6XL.safetensors

# SDXL VAE fp16 fix (~330MB) for clean outputs across all SDXL-based models
RUN mkdir -p /comfyui/models/vae \
 && wget -q -O /comfyui/models/vae/sdxl_vae.safetensors \
    "https://huggingface.co/madebyollin/sdxl-vae-fp16-fix/resolve/main/sdxl_vae.safetensors" \
 && ls -lh /comfyui/models/vae/sdxl_vae.safetensors

# Inherit CMD/ENTRYPOINT from base — no overrides.
