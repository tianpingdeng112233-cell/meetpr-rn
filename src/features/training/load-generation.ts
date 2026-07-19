export class LoadGeneration {
  private readonly generations = new Map<string, number>();

  begin(scope: string): number {
    const next = (this.generations.get(scope) ?? 0) + 1;
    this.generations.set(scope, next);
    return next;
  }

  isCurrent(scope: string, generation: number): boolean {
    return this.generations.get(scope) === generation;
  }
}
