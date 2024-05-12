import { Deferred, deferred, noop } from '@dedot/utils';

export type WorkItem<T = any> = (...args: any[]) => Promise<T> | T;
type Work = { work: WorkItem; defer: Deferred<any> };

/**
 * @name AsyncQueue
 * @description A queue to process async works in sequence,
 * only one work is processed at a time
 */
export class AsyncQueue {
  _works: Array<Work>;
  _working: boolean;
  _currentWork?: Work;

  constructor() {
    this._works = [];
    this._working = false;
  }

  /**
   * Enqueue a work to be processed
   *
   * @param work
   */
  enqueue<T = any>(work: WorkItem<T>): Promise<T> {
    const defer = deferred<T>();
    this._works.push({ work, defer });
    this.dequeue().catch(noop);

    return defer.promise;
  }

  /**
   * Clear the pending works queue
   */
  clear() {
    this._works.forEach(({ defer }) => {
      defer.reject(new Error('Queue cleaned'));
    });

    this._works = [];
  }

  /**
   * Cancel the current work & clear the queue
   */
  cancel() {
    this.cancelCurrentWork();
    this.clear();
  }

  /**
   * Cancel the current work if there is any work is going on
   */
  cancelCurrentWork() {
    if (!this._currentWork) return;

    this._currentWork.defer.reject(new Error('Work cancelled'));
  }

  protected async dequeue(): Promise<void> {
    if (this._working) return;

    this._currentWork = this._works.shift();
    if (!this._currentWork) return;

    const { defer, work } = this._currentWork;

    try {
      this._working = true;
      const result = await work(this);
      this._working = false;
      defer.resolve(result);
    } catch (e: any) {
      this._working = false;
      defer.reject(e);
    } finally {
      this.dequeue().catch(noop);
    }
  }
}
