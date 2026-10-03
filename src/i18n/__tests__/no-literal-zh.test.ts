import { expect, test } from '@jest/globals';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const root = path.resolve(__dirname, '../../..');

function sourceFiles(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    const relative = path.relative(root, file).replaceAll(path.sep, '/');
    // Translation data and test expectations are not application copy.
    if (entry.name === '__tests__' || entry.name === 'tests' ||
        relative === 'src/i18n/catalog') return [];
    return entry.isDirectory() ? sourceFiles(file) : /(?<!\.test|\.spec)\.tsx?$/.test(file) ? [file] : [];
  });
}

test('application source contains no Chinese literals without any screen exemptions', () => {
  const literals: string[] = [];
  for (const file of sourceFiles(path.join(root, 'src'))) {
    const source = fs.readFileSync(file, 'utf8');
    const relative = path.relative(root, file).replaceAll(path.sep, '/');
    // SetRef's Chinese canonical line is frozen message wire data shared with iOS/plan-web.
    if (relative === 'src/features/chat/set-ref.ts') continue;
    const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
    const visit = (node: ts.Node) => {
      if (ts.isStringLiteralLike(node) || ts.isTemplateHead(node) ||
          ts.isTemplateMiddle(node) || ts.isTemplateTail(node) || ts.isJsxText(node)) {
        const start = ast.getLineAndCharacterOfPosition(node.getStart(ast)).line;
        node.getText(ast).split('\n').forEach((text, offset) => {
          if (!/\p{Script=Han}/u.test(text)) return;
          const line = start + offset;
          const location = `${relative}:${line + 1}`;
          literals.push(`${location} ${text}`);
        });
      }
      ts.forEachChild(node, visit);
    };
    visit(ast);
  }
  expect(literals).toEqual([]);
});
