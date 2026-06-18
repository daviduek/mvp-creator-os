#!/bin/bash
# Download large models on first worker spawn if not already present.
# These persist in /comfyui/models/ which is per-container disk.

MODELS_DIR=/comfyui/models
SDXL="${MODELS_DIR}/checkpoints/sd_xl_base_1.0.safetensors"
SDXL_VAE="${MODELS_DIR}/vae/sdxl_vae.safetensors"
CN_POSE="${MODELS_DIR}/controlnet/controlnet-openpose-sdxl.safetensors"

mkdir -p "${MODELS_DIR}/checkpoints" "${MODELS_DIR}/vae" "${MODELS_DIR}/controlnet"

if [ ! -f "$SDXL" ]; then
  echo "[init_models] Downloading SDXL base (~6.5GB)..."
  wget -q --show-progress \
    "https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0/resolve/main/sd_xl_base_1.0.safetensors" \
    -O "$SDXL"
fi

if [ ! -f "$SDXL_VAE" ]; then
  echo "[init_models] Downloading SDXL VAE (~330MB)..."
  wget -q "https://huggingface.co/madebyollin/sdxl-vae-fp16-fix/resolve/main/sdxl_vae.safetensors" -O "$SDXL_VAE"
fi

if [ ! -f "$CN_POSE" ]; then
  echo "[init_models] Downloading ControlNet OpenPose SDXL (~2.5GB)..."
  wget -q "https://huggingface.co/xinsir/controlnet-openpose-sdxl-1.0/resolve/main/diffusion_pytorch_model.safetensors" -O "$CN_POSE" \
    || echo "[init_models] ControlNet pose download failed (pose mode will be unavailable)"
fi

echo "[init_models] Done."
