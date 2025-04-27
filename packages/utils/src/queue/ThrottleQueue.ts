import { assert } from '../assert.js';

export type AsyncTask<T> = () => Promise<T>;

/**
 * @name ThrottleQueue
 * @description A queue that limits the number of concurrent async tasks.
 * Tasks are executed immediately until the concurrency limit is reached,
 * at which point they are queued and executed as running tasks complete.
 */
export class ThrottleQueue {
  private maxConcurrentTasks: number;
  private running: number = 0;
  private queue: { resolve: () => void; reject: (error: Error) => void }[] = [];
  private _active: boolean = true;

  /**
   * Creates a new ThrottleQueue
   * 
   * @param maxConcurrentTasks Maximum number of tasks to run concurrently
   */
  constructor(maxConcurrentTasks: number) {
    this.maxConcurrentTasks = maxConcurrentTasks;
  }

  /**
   * Adds a task to the queue. The task will be executed immediately if
   * the concurrency limit has not been reached, otherwise it will be queued.
   * 
   * @param task The async task to execute
   * @returns A promise that resolves with the task result
   * @throws If the queue has been cancelled
   */
  async add<T>(task: AsyncTask<T>): Promise<T> {
    assert(this._active, 'Queue has been cancelled');

    // If concurrency limit reached, wait
    if (this.running >= this.maxConcurrentTasks) {
      await new Promise<void>((resolve, reject) => {
        this.queue.push({ 
          resolve, 
          reject: (error: Error) => reject(error)
        });
      });
      
      // Check if queue was cancelled while waiting
      assert(this._active, 'Queue has been cancelled');
    }

    this.running++;

    try {
      return await task();
    } finally {
      this.running--;
      // Run next queued task if any
      if (this.queue.length > 0) {
        const next = this.queue.shift();
        if (next) next.resolve();
      }
    }
  }

  /**
   * Cancels all pending tasks in the queue and resets the queue to an active state.
   * Currently running tasks will still complete.
   */
  cancel(): void {
    // Set queue to inactive to reject any tasks that are waiting
    this._active = false;
    
    // Store the current queue and clear it
    const currentQueue = [...this.queue];
    this.queue = [];
    
    // Reject all pending promises
    currentQueue.forEach(({ reject }) => {
      reject(new Error('Queue has been cancelled'));
    });
    
    // Reset the queue to active state for future tasks
    this._active = true;
  }

  /**
   * Gets the number of tasks currently in the queue
   */
  get size(): number {
    return this.queue.length;
  }

  /**
   * Gets the number of tasks currently running
   */
  get runningCount(): number {
    return this.running;
  }

  /**
   * Gets whether the queue is active
   */
  get active(): boolean {
    return this._active;
  }
}
