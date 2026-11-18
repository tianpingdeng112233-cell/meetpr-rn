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

// Only this precise protocol constant is frozen for legacy clients.
function isFrozenChatVideoBody(relative: string, node: ts.Node): boolean {
  return relative === 'src/api/domains/chat.ts' && ts.isStringLiteral(node) && node.text === '[视频]' &&
    ts.isVariableDeclaration(node.parent) && ts.isIdentifier(node.parent.name) && node.parent.name.text === 'CHAT_VIDEO_FALLBACK_BODY';
}

test('the wire allowance still rejects other names, values and UI file paths', () => {
  const nodes = (source: string) => {
    const ast = ts.createSourceFile('fixture.ts', source, ts.ScriptTarget.Latest, true);
    const strings: ts.StringLiteral[] = [];
    function visit(node: ts.Node) { if (ts.isStringLiteral(node)) strings.push(node); ts.forEachChild(node, visit); }
    visit(ast); return strings;
  };
  const [wire, ui, changed] = nodes("const CHAT_VIDEO_FALLBACK_BODY = '[视频]'; const label = '视频'; const CHAT_VIDEO_FALLBACK_BODY = '别的视频';");
  expect(isFrozenChatVideoBody('src/api/domains/chat.ts', wire)).toBe(true);
  expect(isFrozenChatVideoBody('src/api/domains/chat.ts', ui)).toBe(false);
  expect(isFrozenChatVideoBody('src/api/domains/chat.ts', changed)).toBe(false);
  expect(isFrozenChatVideoBody('src/features/chat/ChatStandaloneVideo.tsx', wire)).toBe(false);
});

test('application source contains no Chinese literals without any screen exemptions', () => {
  const literals: string[] = [];
  for (const file of sourceFiles(path.join(root, 'src'))) {
    const source = fs.readFileSync(file, 'utf8');
    const relative = path.relative(root, file).replaceAll(path.sep, '/');
    // SetRef's Chinese canonical line is frozen message wire data shared with iOS/plan-web.
    if (relative === 'src/features/chat/set-ref.ts') continue;
    const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
    const visit = (node: ts.Node) => {
      if (isFrozenChatVideoBody(relative, node)) return;
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
