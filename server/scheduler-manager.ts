type TimerHandle = ReturnType<typeof setInterval> | ReturnType<typeof setTimeout>;

interface RegisteredJob {
  name: string;
  type: 'interval' | 'timeout';
  handle: TimerHandle;
}

class SchedulerManager {
  private jobs: RegisteredJob[] = [];
  private running = false;

  registerInterval(name: string, fn: () => void, ms: number): TimerHandle {
    const handle = setInterval(fn, ms);
    this.jobs.push({ name, type: 'interval', handle });
    return handle;
  }

  registerTimeout(name: string, fn: () => void, ms: number): TimerHandle {
    const handle = setTimeout(fn, ms);
    this.jobs.push({ name, type: 'timeout', handle });
    return handle;
  }

  start() {
    this.running = true;
  }

  stop() {
    for (const job of this.jobs) {
      if (job.type === 'interval') {
        clearInterval(job.handle);
      } else {
        clearTimeout(job.handle);
      }
    }
    this.jobs.length = 0;
    this.running = false;
  }

  isRunning() {
    return this.running;
  }

  getJobCount() {
    return this.jobs.length;
  }

  getJobNames(): string[] {
    return this.jobs.map(j => j.name);
  }
}

export const schedulerManager = new SchedulerManager();
