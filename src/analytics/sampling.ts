const FNV_OFFSET_BASIS_64 = 14_695_981_039_346_656_037n;
const FNV_PRIME_64 = 1_099_511_628_211n;

function normalizeUUIDString(value: string): string {
  return value.toUpperCase();
}

export function fnv1a64(value: string): bigint {
  let hash = FNV_OFFSET_BASIS_64;
  for (const character of value) {
    const codePoint = character.codePointAt(0) ?? 0;
    const bytes =
      codePoint <= 0x7f
        ? [codePoint]
        : codePoint <= 0x7ff
          ? [0xc0 | (codePoint >> 6), 0x80 | (codePoint & 0x3f)]
          : codePoint <= 0xffff
            ? [
                0xe0 | (codePoint >> 12),
                0x80 | ((codePoint >> 6) & 0x3f),
                0x80 | (codePoint & 0x3f),
              ]
            : [
                0xf0 | (codePoint >> 18),
                0x80 | ((codePoint >> 12) & 0x3f),
                0x80 | ((codePoint >> 6) & 0x3f),
                0x80 | (codePoint & 0x3f),
              ];

    for (const byte of bytes) {
      hash ^= BigInt(byte);
      hash = BigInt.asUintN(64, hash * FNV_PRIME_64);
    }
  }
  return hash;
}

export function samplingBucket(anonId: string): number {
  const normalizedAnonId = normalizeUUIDString(anonId);
  return Number(fnv1a64(normalizedAnonId) % 10_000n);
}

export function isSampledIn(anonId: string, sampleRate: number): boolean {
  if (sampleRate <= 0) {
    return false;
  }
  if (sampleRate >= 1) {
    return true;
  }
  return samplingBucket(anonId) / 10_000 < sampleRate;
}
