import { expect, test } from '@jest/globals';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '../../..');

function sourceFiles(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? sourceFiles(file) : [file];
  });
}

test('src contains no unresolved i18n markers, including tests and catalogs', () => {
  // Assemble the search text so the guard can scan its own source too.
  const marker = ['TODO', '(i18n'].join('');
  const unresolved = sourceFiles(path.join(root, 'src')).flatMap((file) =>
    fs.readFileSync(file, 'utf8').split('\n').flatMap((line, index) =>
      line.includes(marker) ? [`${path.relative(root, file)}:${index + 1} ${line.trim()}`] : []),
  );
  expect(unresolved).toEqual([]);
});
