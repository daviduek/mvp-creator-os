"""RunPod Serverless handler — orchestrates ComfyUI generations."""
import os
import sys
import time
import traceback

# Force unbuffered stdout so logs appear in RunPod dashboard immediately
sys.stdout.reconfigure(line_buffering=True)
sys.stderr.reconfigure(line_buffering=True)
print("[handler] Module loading...", flush=True)

import runpod

from comfy_client import ComfyClient
from r2_uploader import upload_bytes
from tiktok_downloader import download_video
from workflow_builders import build_workflow

COMFY_URL = os.environ.get("COMFY_URL", "http://127.0.0.1:8188")
LORA_URL = os.environ.get("SASHA_LORA_URL", "")
LORA_LOCAL_NAME = "sashavan.safetensors"
print(f"[handler] Config: COMFY_URL={COMFY_URL} | LORA_URL_set={bool(LORA_URL)}", flush=True)


def ensure_lora_present(comfy: ComfyClient):
    """Ensure the Sasha LoRA is loaded into ComfyUI's loras/ folder."""
    if not LORA_URL:
        raise RuntimeError("SASHA_LORA_URL no configurado")
    comfy.download_model(LORA_URL, "loras", LORA_LOCAL_NAME)


def handler(event):
    try:
        job_input = event.get("input", {})
        wf = job_input.get("workflow")
        if not wf:
            return {"error": "Falta input.workflow"}

        wf_type = wf.get("type")
        if wf_type not in ("t2i", "i2v", "t2v", "motion", "pose"):
            return {"error": f"Tipo de workflow inválido: {wf_type}"}

        comfy = ComfyClient(COMFY_URL)
        print(f"[handler] Waiting for ComfyUI at {COMFY_URL}...", flush=True)
        comfy.wait_until_ready(timeout=300)
        print("[handler] ComfyUI ready.", flush=True)
        ensure_lora_present(comfy)

        if wf_type == "motion" and wf.get("motion_source", {}).get("type") == "tiktok":
            tt_url = wf["motion_source"]["url"]
            local_path = download_video(tt_url)
            wf["motion_source"] = {"type": "local", "path": local_path}

        graph = build_workflow(wf, lora_name=LORA_LOCAL_NAME)

        prompt_id = comfy.submit(graph)
        outputs = comfy.wait_for_outputs(prompt_id, timeout=600)

        if not outputs:
            return {"error": "ComfyUI no devolvió outputs"}

        is_video = wf_type in ("i2v", "t2v", "motion")
        result_files = []
        for filename in outputs:
            data = comfy.fetch_output(filename)
            ext = filename.split(".")[-1]
            folder = "outputs/video" if is_video else "outputs/image"
            ts = int(time.time() * 1000)
            key = f"{folder}/{ts}-{filename}"
            content_type = "video/mp4" if is_video else "image/png"
            public_url = upload_bytes(key, data, content_type)
            result_files.append(public_url)

        return {"url": result_files[0], "all": result_files}

    except Exception as e:
        traceback.print_exc()
        return {"error": f"{type(e).__name__}: {e}"}


print("[handler] Registering with RunPod serverless...", flush=True)
runpod.serverless.start({"handler": handler})
