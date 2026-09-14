import { pathToFileURL } from 'node:url';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const { FOODS } = await import(pathToFileURL(path.join(root, 'src/data/foods.js')).href);
const { EXERCISES, BODY_PARTS, exercisesByPart } = await import(
  pathToFileURL(path.join(root, 'src/data/exercises.js')).href
);

const foodCount = FOODS.length;
const exCount = EXERCISES.length;

if (foodCount < 80) {
  throw new Error(`Expected at least 80 sample foods, got ${foodCount}`);
}
if (exCount < 100 || exCount > 250) {
  throw new Error(`Expected 100–250 exercises, got ${exCount}`);
}

const missing = BODY_PARTS.filter((p) => exercisesByPart(p.id).length === 0);
if (missing.length) {
  throw new Error(`Missing exercises for: ${missing.map((p) => p.id).join(', ')}`);
}

if (FOODS.some((f) => !f.name || Number.isNaN(f.calories))) {
  throw new Error('Food data is malformed');
}

console.log(`OK: ${foodCount} foods, ${exCount} exercises across ${BODY_PARTS.length} body parts`);
