#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();

const pairs = [
  {
    name: 'mobile i18n',
    files: [
      path.join(root, 'apps/mobile/src/i18n/en.json'),
      path.join(root, 'apps/mobile/src/i18n/zh.json'),
    ],
  },
  {
    name: 'web i18n',
    files: [
      path.join(root, 'apps/web/lib/i18n/en.json'),
      path.join(root, 'apps/web/lib/i18n/zh.json'),
    ],
  },
];

const flattenKeys = (value, prefix = '') => {
  if (value === null || typeof value !== 'object') {
    return [prefix].filter(Boolean);
  }

  if (Array.isArray(value)) {
    return value.flatMap((item, index) =>
      flattenKeys(item, prefix ? `${prefix}[${index}]` : `[${index}]`),
    );
  }

  return Object.keys(value).flatMap((key) => {
    const nextPrefix = prefix ? `${prefix}.${key}` : key;
    return flattenKeys(value[key], nextPrefix);
  });
};

const loadJson = async (file) => {
  const raw = await readFile(file, 'utf8');
  return JSON.parse(raw);
};

const compareKeySets = (leftKeys, rightKeys) => {
  const leftSet = new Set(leftKeys);
  const rightSet = new Set(rightKeys);

  const missingInRight = [...leftSet].filter((key) => !rightSet.has(key));
  const missingInLeft = [...rightSet].filter((key) => !leftSet.has(key));
  return { missingInRight, missingInLeft };
};

let hasFailure = false;

for (const pair of pairs) {
  try {
    const [aPath, bPath] = pair.files;
    const [aJson, bJson] = await Promise.all([loadJson(aPath), loadJson(bPath)]);
    const aKeys = flattenKeys(aJson);
    const bKeys = flattenKeys(bJson);
    const { missingInRight, missingInLeft } = compareKeySets(aKeys, bKeys);

    if (missingInRight.length || missingInLeft.length) {
      hasFailure = true;
      if (missingInRight.length) {
        console.error(
          `[i18n] ${pair.name}: Missing keys in second file (${path.basename(bPath)}):\n  - ${missingInRight.join(
            '\n  - ',
          )}`,
        );
      }
      if (missingInLeft.length) {
        console.error(
          `[i18n] ${pair.name}: Extra keys in second file (${path.basename(bPath)}):\n  - ${missingInLeft.join(
            '\n  - ',
          )}`,
        );
      }
    } else {
      console.log(`[i18n] ${pair.name}: OK (${path.basename(aPath)} ⇔ ${path.basename(bPath)})`);
    }
  } catch (error) {
    hasFailure = true;
    console.error(`[i18n] ${pair.name}: Failed to verify`, error);
  }
}

if (hasFailure) {
  process.exitCode = 1;
} else {
  console.log('[i18n] All translation files are in sync.');
}
