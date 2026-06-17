"""Download TikTok/IG/YT videos via yt-dlp for motion reference."""
import os
import subprocess
import tempfile
import uuid


def download_video(url: str, max_duration_seconds: int = 30) -> str:
    """Returns local path to the downloaded mp4."""
    out_dir = tempfile.gettempdir()
    out_path = os.path.join(out_dir, f"motion_ref_{uuid.uuid4().hex}.mp4")
    cmd = [
        "yt-dlp",
        "-f", "mp4/bestvideo[ext=mp4]+bestaudio[ext=m4a]/best",
        "--no-playlist",
        "--no-warnings",
        "-o", out_path,
        url,
    ]
    res = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
    if res.returncode != 0:
        raise RuntimeError(f"yt-dlp falló: {res.stderr[:400]}")
    if not os.path.exists(out_path):
        raise RuntimeError("yt-dlp no produjo archivo")
    # Trim if too long
    probe = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", out_path],
        capture_output=True, text=True,
    )
    try:
        dur = float(probe.stdout.strip())
    except Exception:
        dur = 0
    if dur > max_duration_seconds:
        trimmed = out_path.replace(".mp4", "_trim.mp4")
        subprocess.run(
            ["ffmpeg", "-y", "-i", out_path, "-t", str(max_duration_seconds), "-c", "copy", trimmed],
            capture_output=True,
        )
        os.remove(out_path)
        return trimmed
    return out_path
