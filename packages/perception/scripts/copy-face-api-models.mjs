// Copy the face-api weights we use (age + tiny face detector) from the installed
// @vladmandic/face-api package into the locations the apps serve them from.
// Run after `pnpm install` if the package version changes. Idempotent.
import { createRequire } from 'node:module';
import { cpSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const pkgRoot = dirname(require.resolve('@vladmandic/face-api/package.json'));
const srcDir = join(pkgRoot, 'model');

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, '..', '..', '..');

const targets = [
  join(here, '..', 'models', 'face-api'), // packages/perception/models/face-api
  join(repoRoot, 'apps', 'web', 'public', 'models', 'face-api'),
];

const files = [
  'age_gender_model-weights_manifest.json',
  'age_gender_model.bin',
  'tiny_face_detector_model-weights_manifest.json',
  'tiny_face_detector_model.bin',
];

for (const target of targets) {
  mkdirSync(target, { recursive: true });
  for (const f of files) cpSync(join(srcDir, f), join(target, f));
  console.log(`Copied ${files.length} face-api model files -> ${target}`);
}
