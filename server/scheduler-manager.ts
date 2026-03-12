type TimerHandle = ReturnType<typeof setInterval> | ReturnType<typeof setTimeout>;

interface RegisteredJob {
  name: string;
  type: 'interval' | 'timeout';
  handle: TimerHandle;
}

class SchedulerManager {
  private jobs = new Map<string, RegisteredJob>();
  private running = false;

  registerInterval(name: string, fn: () => void, ms: number): TimerHandle {
    if (this.jobs.has(name)) {
      const existing = this.jobs.get(name)!;
      if (existing.type === 'interval') clearInterval(existing.handle);
      else clearTimeout(existing.handle);
    }
    const handle = setInterval(fn, ms);
    this.jobs.set(name, { name, type: 'interval', handle });
    return handle;
  }

  registerTimeout(name: string, fn: () => void, ms: number): TimerHandle {
    if (this.jobs.has(name)) {
      const existing = this.jobs.get(name)!;
      if (existing.type === 'interval') clearInterval(existing.handle);
      else clearTimeout(existing.handle);
    }
    const wrappedFn = () => {
      fn();
      this.jobs.delete(name);
    };
    const handle = setTimeout(wrappedFn, ms);
    this.jobs.set(name, { name, type: 'timeout', handle });
    return handle;
  }

  hasJob(name: string): boolean {
    return this.jobs.has(name);
  }

  removeJob(name: string): void {
    const job = this.jobs.get(name);
    if (job) {
      if (job.type === 'interval') clearInterval(job.handle);
      else clearTimeout(job.handle);
      this.jobs.delete(name);
    }
  }

  start() {
    this.running = true;
  }

  stop() {
    for (const job of this.jobs.values()) {
      if (job.type === 'interval') clearInterval(job.handle);
      else clearTimeout(job.handle);
    }
    this.jobs.clear();
    this.running = false;
  }

  isRunning() {
    return this.running;
  }

  getJobCount() {
    return this.jobs.size;
  }

  getJobNames(): string[] {
    return Array.from(this.jobs.keys());
  }
}

export const schedulerManager = new SchedulerManager();
