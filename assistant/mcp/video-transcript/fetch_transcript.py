"""提取线上视频字幕/转录文本；无字幕时回退到音频转写。
用法: python fetch_transcript.py <url>
输出 JSON: { success, title, duration, transcript, source, languages, channel, method }
依赖: pip install yt-dlp faster-whisper
"""
import json
import logging
import os
import re
import sys
import tempfile

import yt_dlp

# 国内访问 HuggingFace 直连不稳定，默认走 hf-mirror.com 镜像下载 Whisper 模型。
os.environ.setdefault("HF_ENDPOINT", "https://hf-mirror.com")

# 优先的英文字幕（原字幕或自动字幕），其次简体中文。
PREFERRED_LANGS = ["en-orig", "en", "en-US", "zh-Hans", "zh-CN", "zh", "zh-Hant"]


def _null_logger() -> logging.Logger:
    logger = logging.getLogger("yt-dlp-null")
    logger.addHandler(logging.NullHandler())
    logger.propagate = False
    return logger


def vtt_to_text(source: str) -> str:
    """把 VTT/SRT 字幕文本解析为纯文本，去除时间轴、标签与滚幕重复行。"""
    lines: list[str] = []
    last = ""
    for raw in source.splitlines():
        line = raw.strip()
        if not line or line in ("WEBVTT", "STYLE", "NOTE"):
            continue
        if "-->" in line:
            continue
        if re.fullmatch(r"\d{1,2}:\d{2}:\d{2}[.,]\d{1,3}", line):
            continue
        if line.startswith("Kind:") or line.startswith("Language:"):
            continue
        line = re.sub(r"<[^>]+>", "", line)
        line = re.sub(r"^\s*(align|position|line|size):[^ ]+", "", line).strip()
        if not line:
            continue
        if line == last:
            continue
        lines.append(line)
        last = line
    return "\n".join(lines)


def _pick_language(info: dict) -> str | None:
    """在可用字幕（含自动字幕）里按优先级挑一种语言。"""
    available = set(info.get("subtitles", {})) | set(info.get("automatic_captions", {}))
    for lang in PREFERRED_LANGS:
        if lang in available:
            return lang
    if available:
        return next(iter(available))
    return None


def _download_subtitles(url: str, info: dict) -> tuple[str, str]:
    """下载选中的字幕文件，返回 (路径, 语言)。无可用字幕时抛异常。"""
    lang = _pick_language(info)
    if not lang:
        raise RuntimeError("该视频没有可用字幕，回退到音频转写")
    outdir = tempfile.mkdtemp(prefix="video-sub-")
    opts = {
        "skip_download": True,
        "writesubtitles": True,
        "writeautomaticsub": True,
        "subtitleslangs": [lang],
        "subtitlesformat": "vtt/srt",
        "outtmpl": os.path.join(outdir, "sub"),
        "noplaylist": True,
        "quiet": True,
        "no_warnings": True,
        "noprogress": True,
        "logger": _null_logger(),
    }
    with yt_dlp.YoutubeDL(opts) as ydl:
        ydl.extract_info(url, download=True)
    candidates = [
        os.path.join(outdir, f"sub.{lang}.vtt"),
        os.path.join(outdir, f"sub.{lang}.srt"),
    ]
    sub_path = next((p for p in candidates if os.path.exists(p)), None)
    if not sub_path:
        files = [f for f in os.listdir(outdir) if f.endswith((".vtt", ".srt"))]
        sub_path = os.path.join(outdir, sorted(files)[0]) if files else None
    if not sub_path:
        raise RuntimeError("字幕下载失败")
    return sub_path, lang


def _transcribe_audio(url: str) -> str:
    """下载音频并用 faster-whisper 转写为文本。"""
    from faster_whisper import WhisperModel

    outdir = tempfile.mkdtemp(prefix="video-audio-")
    opts = {
        "format": "bestaudio[ext=m4a]/bestaudio",
        "outtmpl": os.path.join(outdir, "audio.%(ext)s"),
        "noplaylist": True,
        "quiet": True,
        "no_warnings": True,
        "noprogress": True,
        "logger": _null_logger(),
    }
    with yt_dlp.YoutubeDL(opts) as ydl:
        ydl.extract_info(url, download=True)
    audio_files = [f for f in os.listdir(outdir) if f.startswith("audio.")]
    if not audio_files:
        raise RuntimeError("音频下载失败")
    audio_path = os.path.join(outdir, sorted(audio_files)[0])

    # base 模型首次使用会从 HuggingFace 下载（约 140MB）。
    model = WhisperModel("base", device="cpu", compute_type="int8")
    segments, _info = model.transcribe(audio_path, vad_filter=True)
    return "".join(segment.text for segment in segments).strip()


def fetch_transcript(url: str) -> dict:
    base_opts = {
        "noplaylist": True,
        "quiet": True,
        "no_warnings": True,
        "noprogress": True,
        "logger": _null_logger(),
    }
    with yt_dlp.YoutubeDL({**base_opts, "skip_download": True}) as ydl:
        info = ydl.extract_info(url, download=False)

    method = "subtitles"
    try:
        sub_path, lang = _download_subtitles(url, info)
        with open(sub_path, encoding="utf-8") as f:
            transcript = vtt_to_text(f.read())
        if not transcript.strip():
            raise RuntimeError("字幕内容为空")
        language_label = [lang]
    except Exception as sub_error:
        # 无字幕/字幕失败 → 回退音频转写。
        transcript = _transcribe_audio(url)
        if not transcript:
            raise RuntimeError(f"字幕与转写都失败：{sub_error}")
        method = "audio-transcription"
        language_label = ["auto"]

    return {
        "title": info.get("title", ""),
        "duration": info.get("duration", 0),
        "transcript": transcript,
        "source": url,
        "languages": language_label,
        "channel": info.get("channel", ""),
        "method": method,
    }


if __name__ == "__main__":
    url = sys.argv[1] if len(sys.argv) > 1 else ""
    if not url:
        print(json.dumps({"success": False, "error": "缺少视频 URL"}, ensure_ascii=False))
        sys.exit(1)
    try:
        result = fetch_transcript(url)
        print(json.dumps({"success": True, **result}, ensure_ascii=False))
    except Exception as exc:  # noqa: BLE001
        print(json.dumps({"success": False, "error": str(exc)}, ensure_ascii=False))
        sys.exit(1)
