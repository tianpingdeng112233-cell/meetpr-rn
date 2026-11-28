export class SerialTaskQueue {
  private tail: Promise<void> = Promise.resolve();
  private users = 0;
  private usersIdle: Promise<void> = Promise.resolve();
  private releaseUsers: (() => void) | null = null;
  private yieldRunning: (() => void) | null = null;

  enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const task = this.tail.then(operation, operation);
    this.tail = task.then(
      () => undefined,
      () => undefined,
    );
    return task;
  }

  /** Work the user is waiting on never queues behind background work; preemptible work yields to it. */
  async runUserTask<T>(operation: () => Promise<T>): Promise<T> {
    if (this.users++ === 0) this.usersIdle = new Promise(resolve => { this.releaseUsers = resolve; });
    this.yieldRunning?.();
    try {
      return await operation();
    } finally {
      if (--this.users === 0) {
        const release = this.releaseUsers;
        this.releaseUsers = null;
        release?.();
      }
    }
  }

  /**
   * Queued background work that waits while user work runs. If user work arrives mid-run,
   * `yielded` aborts: the operation should stop, and it is started again from scratch once
   * the user work is done. An operation that has not settled `abandonMs` after yielding is
   * abandoned so the queue cannot stall; a result that still arrives in time is kept.
   */
  enqueuePreemptible<T>(operation: (yielded: AbortSignal) => Promise<T>, abandonMs = 5000): Promise<T> {
    return this.enqueue(async () => {
      for (;;) {
        if (this.users > 0) await this.usersIdle;
        const controller = new AbortController();
        let timer: ReturnType<typeof setTimeout> | undefined;
        const abandoned = new Promise<null>(resolve => {
          this.yieldRunning = () => {
            if (controller.signal.aborted) return;
            controller.abort();
            timer = setTimeout(() => resolve(null), abandonMs);
          };
        });
        const settled = operation(controller.signal).then(
          value => ({ ok: true as const, value }),
          (error: unknown) => ({ ok: false as const, error }),
        );
        const outcome = await Promise.race([settled, abandoned]);
        this.yieldRunning = null;
        clearTimeout(timer);
        if (outcome?.ok) return outcome.value;
        if (controller.signal.aborted) continue;
        throw outcome!.error;
      }
    });
  }
}
