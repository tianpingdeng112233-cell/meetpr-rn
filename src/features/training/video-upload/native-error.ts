export class VideoNativeError extends Error {
  readonly deterministic: boolean;
  constructor(
    readonly copy: string,
    options?: { cause?: unknown; deterministic?: boolean },
  ) {
    super(copy, options);
    this.deterministic = options?.deterministic ?? false;
  }
}
