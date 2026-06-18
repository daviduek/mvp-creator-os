# syntax=docker/dockerfile:1.7
# Start from RunPod's official ComfyUI worker, base variant (no models).
FROM runpod/worker-comfyui:5.5.0-base

# Sasha LoRA trained ON Pony V6 XL → use with CyberRealistic Pony (same family).
RUN mkdir -p /comfyui/models/loras \
 && wget -q -O /comfyui/models/loras/sashavan_pony.safetensors \
    "https://pub-59a7dc0002a9480faf4f6cb09c2bfd5e.r2.dev/loras/sashavan_pony.safetensors" \
 && ls -lh /comfyui/models/loras/sashavan_pony.safetensors

# CyberRealistic Pony v18.0 CoreShift — Pony V6 XL fine-tune for photorealism + NSFW.
# Best of both worlds: Pony's content freedom + photorealistic quality.
RUN --mount=type=secret,id=civitai_token \
    mkdir -p /comfyui/models/checkpoints \
 && TOKEN="$(cat /run/secrets/civitai_token)" \
 && wget --tries=3 --timeout=60 \
    -O /comfyui/models/checkpoints/cyberrealisticPony.safetensors \
    "https://civitai.com/api/download/models/2884631?token=${TOKEN}" \
 && ls -lh /comfyui/models/checkpoints/cyberrealisticPony.safetensors \
 && test $(stat -c %s /comfyui/models/checkpoints/cyberrealisticPony.safetensors) -gt 5000000000

# SDXL VAE fp16 fix (~330MB) for clean outputs
RUN mkdir -p /comfyui/models/vae \
 && wget -q -O /comfyui/models/vae/sdxl_vae.safetensors \
    "https://huggingface.co/madebyollin/sdxl-vae-fp16-fix/resolve/main/sdxl_vae.safetensors" \
 && ls -lh /comfyui/models/vae/sdxl_vae.safetensors

# Inherit CMD/ENTRYPOINT from base.
