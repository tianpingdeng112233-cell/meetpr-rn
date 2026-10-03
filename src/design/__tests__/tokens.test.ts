import { expect, test } from '@jest/globals';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { font, radius, resolveColors, typography } from '../tokens';

test('resolves the v3 light page and both primary CTA backgrounds', () => {
  expect(resolveColors('light').bgBase).toBe('#F5F6F8');
  expect(resolveColors('dark').ctaBackground).toBe('#FFB800');
  expect(resolveColors('light').ctaBackground).toBe('#111827');
});

test('title1 uses Archivo ExtraBold 34 and mono leaves tracking to roles', () => {
  expect(typography.title1.fontFamily).toBe('Archivo_800ExtraBold');
  expect(typography.title1.fontSize).toBe(34);
  expect(font.mono(12, 'semibold').letterSpacing).toBeUndefined();
});

test('card, control and inset radii match v3', () => {
  expect(radius.card).toBe(16);
  expect(radius.control).toBe(12);
  expect(radius.inset).toBe(10);
});

test('src consumers contain zero legacy color references', () => {
  const sourceRoot = path.resolve(__dirname, '../..');
  const legacy = /\bcolors\s*(?:\.\s*(?:brandRed(?:Press|Soft)?|green(?:Soft)?|amber(?:Soft)?|bg|surface[123]|border|fg(?:Primary|Secondary|Tertiary|Disabled))\b|\[\s*['"](?:brandRed(?:Press|Soft)?|green(?:Soft)?|amber(?:Soft)?|bg|surface[123]|border|fg(?:Primary|Secondary|Tertiary|Disabled))['"]\s*\])/;
  const violations: string[] = [];
  function scan(directory: string) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== '__tests__') scan(file);
      } else if (/\.tsx?$/.test(entry.name) && !/\.(test|spec)\.tsx?$/.test(entry.name) && file !== path.join(sourceRoot, 'design/tokens.ts')) {
        if (legacy.test(readFileSync(file, 'utf8'))) violations.push(path.relative(sourceRoot, file));
      }
    }
  }
  scan(sourceRoot);
  expect(violations).toEqual([]);
});
