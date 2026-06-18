"""RunPod Serverless handler — orchestrates ComfyUI generations.

Launches ComfyUI as a subprocess directly from Python (no shell script).
Heavy diagnostics: prints land in stdout and stderr from the very first line.
"""
import os
import sys
import subprocess
import threading
import time
import traceback

# Force unbuffered output at the C runtime level
os.environ.setdefault("PYTHONUNBUFFERED", "1")


def _log(msg: str):
    line = f"[handler] {msg}"
    print(line, flush=True)
    print(line, file=sys.stderr, flush=True)


_log("=== handler.py START ===")
_log(f"sys.version = {sys.version.split()[0]}")
_log(f"cwd = {os.getcwd()}")
_log(f"PID = {os.getpid()}")

try:
    import runpod
    _log(f"runpod imported, version = {getattr(runpod, '__version__', 'unknown')}")

    from comfy_client import ComfyClient
    from r2_uploader import upload_bytes
    from tiktok_downloader import download_video
    from workflow_builders import build_workflow
    _log("All local imports OK")
except Exception as e:
    _log(f"FATAL IMPORT ERROR: {type(e).__name__}: {e}")
    traceback.print_exc(file=sys.stdout)
    traceback.print_exc(file=sys.stderr)
    sys.exit(1)


COMFY_URL = os.environ.get("COMFY_URL", "http://127.0.0.1:8188")
LORA_URL = os.environ.get("SASHA_LORA_URL", "")
LORA_LOCAL_NAME = "sashavan.safetensors"
COMFY_DIR = "/workspace/ComfyUI"
_log(f"Config: COMFY_URL={COMFY_URL} | LORA_URL_set={bool(LORA_URL)} | COMFY_DIR={COMFY_DIR}")


def _stream_comfy_output(proc: subprocess.Popen):
    """Pipe ComfyUI's stdout into our logs in real time."""
    if not proc.stdout:
        return
    for line in proc.stdout:
        sys.stdout.write(f"[comfy] {line}")
        sys.stdout.flush()


def launch_comfyui_background():
    """Start ComfyUI in a background subprocess."""
    if not os.path.isdir(COMFY_DIR):
        _log(f"WARNING: {COMFY_DIR} does not exist; ComfyUI cannot launch")
        return None
    _log("Launching ComfyUI subprocess...")
    proc = subprocess.Popen(
        ["python", "-u", "main.py", "--listen", "127.0.0.1", "--port", "8188", "--disable-auto-launch"],
        cwd=COMFY_DIR,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
    )
    _log(f"ComfyUI PID = {proc.pid}")
    t = threading.Thread(target=_stream_comfy_output, args=(proc,), daemon=True)
    t.start()
    return proc


def ensure_lora_present(comfy: ComfyClient):
    if not LORA_URL:
        raise RuntimeError("SASHA_LORA_URL no configurado")
    comfy.download_model(LORA_URL, "loras", LORA_LOCAL_NAME)


def handler(event):
    _log(f"=== JOB RECEIVED: id={event.get('id', '?')} ===")
    try:
        job_input = event.get("input", {})
        wf = job_input.get("workflow")
        if not wf:
            return {"error": "Falta input.workflow"}

        wf_type = wf.get("type")
        if wf_type not in ("t2i", "i2v", "t2v", "motion", "pose"):
            return {"error": f"Tipo de workflow inválido: {wf_type}"}

        comfy = ComfyClient(COMFY_URL)
        _log(f"Waiting for ComfyUI at {COMFY_URL}...")
        comfy.wait_until_ready(timeout=300)
        _log("ComfyUI ready.")
        ensure_lora_present(comfy)
        _log("LoRA ensured.")

        if wf_type == "motion" and wf.get("motion_source", {}).get("type") == "tiktok":
            tt_url = wf["motion_source"]["url"]
            local_path = download_video(tt_url)
            wf["motion_source"] = {"type": "local", "path": local_path}

        graph = build_workflow(wf, lora_name=LORA_LOCAL_NAME)
        _log(f"Submitting graph (type={wf_type})...")

        prompt_id = comfy.submit(graph)
        _log(f"prompt_id={prompt_id}, waiting for outputs...")
        outputs = comfy.wait_for_outputs(prompt_id, timeout=600)

        if not outputs:
            return {"error": "ComfyUI no devolvió outputs"}

        is_video = wf_type in ("i2v", "t2v", "motion")
        result_files = []
        for filename in outputs:
            data = comfy.fetch_output(filename)
            folder = "outputs/video" if is_video else "outputs/image"
            ts = int(time.time() * 1000)
            key = f"{folder}/{ts}-{filename}"
            content_type = "video/mp4" if is_video else "image/png"
            public_url = upload_bytes(key, data, content_type)
            result_files.append(public_url)
            _log(f"Uploaded {filename} → {public_url}")

        return {"url": result_files[0], "all": result_files}

    except Exception as e:
        tb = traceback.format_exc()
        _log(f"HANDLER ERROR: {type(e).__name__}: {e}")
        _log(tb)
        return {"error": f"{type(e).__name__}: {e}", "traceback": tb}


# Launch ComfyUI right before registering with RunPod
_log("Starting ComfyUI subprocess BEFORE runpod.serverless.start()...")
launch_comfyui_background()

_log("Calling runpod.serverless.start({handler})...")
try:
    runpod.serverless.start({"handler": handler})
except Exception as e:
    _log(f"FATAL: runpod.serverless.start raised: {type(e).__name__}: {e}")
    traceback.print_exc(file=sys.stdout)
    sys.exit(1)
