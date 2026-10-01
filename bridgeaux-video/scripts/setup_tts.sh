#!/usr/bin/env bash
# Install the Python tools and download the Kokoro-82M voice model used for
# the narration (Apache-2.0, runs locally, no API key needed).
set -euo pipefail
cd "$(dirname "$0")/.."
pip install --quiet numpy scipy soundfile kokoro-onnx pedalboard pyloudnorm pillow
mkdir -p .cache/tts
base=https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0
[ -f .cache/tts/kokoro-v1.0.onnx ] || curl -sSL -o .cache/tts/kokoro-v1.0.onnx "$base/kokoro-v1.0.onnx"
[ -f .cache/tts/voices-v1.0.bin ] || curl -sSL -o .cache/tts/voices-v1.0.bin "$base/voices-v1.0.bin"
echo "TTS ready in .cache/tts"
