export class StudentTodayRefreshThrottle {
  private lastFullAt: number | null = null;
  refreshWhenReturning(now = Date.now()): 'full' | 'volatileOnly' {
    if (this.lastFullAt !== null && now - this.lastFullAt < 25_000)
      return 'volatileOnly';
    this.lastFullAt = now;
    return 'full';
  }
  recordFullRefresh(now = Date.now()) {
    this.lastFullAt = now;
  }
}
