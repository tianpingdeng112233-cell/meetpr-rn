/** Compare source copy with the iOS catalog without changing display text. */
export function punctuationMatches(source: string, canonical: string): boolean {
  const normalize = (text: string) => text.trim()
    .replace(/[？！，：；（）]/g, (character) => String.fromCharCode(character.charCodeAt(0) - 0xfee0))
    .replace(/、/g, ',')
    .replace(/[「」“”]/g, '"')
    .replace(/…/g, '...');
  return normalize(source) === normalize(canonical);
}
