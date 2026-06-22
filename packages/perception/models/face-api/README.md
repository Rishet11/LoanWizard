# face-api models (age estimation)

Browser age estimation uses [@vladmandic/face-api](https://github.com/vladmandic/face-api).
The weights here are vendored from that npm package (MIT licensed) so the model
works fully offline, with no external download at runtime.

Files:
- `tiny_face_detector_model.*`: lightweight face detector
- `age_gender_model.*`: age/gender estimation net

`AgeEstimator` loads these via `faceapi.nets.*.loadFromUri()`. Served at
`/models/face-api` in the web app and `/face-api` in the standalone demo.

## Regenerating
```bash
# from repo root, after pnpm install
node packages/perception/scripts/copy-face-api-models.mjs
```
