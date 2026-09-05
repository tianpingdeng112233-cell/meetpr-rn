import { expect, test } from '@jest/globals';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const root = path.resolve(__dirname, '../../..');

function sourceFiles(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    const relative = path.relative(root, file).replaceAll(path.sep, '/');
    // G0-b explicitly leaves the CN login and unmerged W1-i onboarding out of scope.
    if (entry.name === '__tests__' || entry.name === 'tests' ||
        relative === 'src/i18n/catalog' || relative === 'src/features/onboarding' ||
        relative === 'src/app/login.tsx') return [];
    return entry.isDirectory() ? sourceFiles(file) : /(?<!\.test|\.spec)\.tsx?$/.test(file) ? [file] : [];
  });
}

test('all in-scope Chinese literals are marked and registered in CODEX-JOURNAL', () => {
  const unmarked: string[] = [];
  const todoLines = new Set<string>();
  for (const file of sourceFiles(path.join(root, 'src'))) {
    const source = fs.readFileSync(file, 'utf8');
    const lines = source.split('\n');
    const relative = path.relative(root, file).replaceAll(path.sep, '/');
    const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
    const visit = (node: ts.Node) => {
      if (ts.isStringLiteralLike(node) || ts.isTemplateHead(node) ||
          ts.isTemplateMiddle(node) || ts.isTemplateTail(node) || ts.isJsxText(node)) {
        const start = ast.getLineAndCharacterOfPosition(node.getStart(ast)).line;
        node.getText(ast).split('\n').forEach((text, offset) => {
          if (!/\p{Script=Han}/u.test(text)) return;
          const line = start + offset;
          const location = `${relative}:${line + 1}`;
          if (!lines[line].includes('TODO(i18n:')) unmarked.push(`${location} ${text}`);
        });
      }
      ts.forEachChild(node, visit);
    };
    visit(ast);
    lines.forEach((line, index) => {
      if (line.includes('TODO(i18n:')) todoLines.add(`${relative}:${index + 1}`);
    });
  }
  expect(unmarked).toEqual([]);
  const journal = fs.readFileSync(path.join(root, 'docs/CODEX-JOURNAL.md'), 'utf8');
  const registered = [...journal.matchAll(/^\| `(src\/[^`]+:\d+)` \|.*\| (?:drift|missing):/gm)]
    .map((match) => match[1]);
  expect(todoLines.size).toBeLessThanOrEqual(registered.length);
  expect([...todoLines].filter((location) => !registered.includes(location))).toEqual([]);
});
