#!/usr/bin/env bash
# Downloads the MoveNet SinglePose Lightning (int8) TFLite model so it can be
# served/bundled locally instead of fetched from Google's CDN at runtime.
# After downloading, point EXPO_PUBLIC_MOVENET_MODEL_URL at wherever you host it.
set -euo pipefail

DIR="$(cd "$(dirname "$0")/.." && pwd)/assets/models"
URL="https://storage.googleapis.com/tfhub-lite-models/google/lite-model/movenet/singlepose/lightning/tflite/int8/4.tflite"

mkdir -p "$DIR"
echo "Downloading MoveNet Lightning (int8) → $DIR/movenet_lightning_int8.tflite"
curl -fSL "$URL" -o "$DIR/movenet_lightning_int8.tflite"
echo "Done. $(du -h "$DIR/movenet_lightning_int8.tflite" | cut -f1) downloaded."
