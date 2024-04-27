import { Deferred, deferred, noop } from '@dedot/utils';

export type WorkItem<T = any> = (...args: any[]) => Promise<T> | T;

/**
 * @name AsyncWorkerQueue
 * @description A queue to process async works in sequence,
 * only one work is processed at a time
 */
export class AsyncWorkerQueue {
  _works: Array<{ work: WorkItem; defer: Deferred<any> }>;
  _working: boolean;

  constructor() {
    this._works = [];
    this._working = false;
  }

  enqueue<T = any>(work: WorkItem<T>): Promise<T> {
    const defer = deferred<T>();
    this._works.push({ work, defer });
    this.dequeue().catch(noop);

    return defer.promise;
  }

  async dequeue(): Promise<void> {
    if (this._working) return;

    const workItem = this._works.shift();
    if (!workItem) return;

    const { defer, work } = workItem;

    try {
      this._working = true;
      const result = await work(this);
      defer.resolve(result);
    } catch (e: any) {
      defer.reject(e);
    } finally {
      this._working = false;
      this.dequeue().catch(noop);
    }
  }
}
