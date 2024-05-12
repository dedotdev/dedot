import { noop } from '@dedot/utils';
import { describe, it, beforeEach, expect } from 'vitest';
import { AsyncQueue } from '../AsyncQueue.js';

describe('AsyncQueue', () => {
  let queue: AsyncQueue;

  beforeEach(() => {
    queue = new AsyncQueue();
  });

  it('should process works in sequence', async () => {
    let result: number = 0;
    const work = async () => {
      return new Promise<number>((resolve) => {
        setTimeout(() => {
          result += 10;

          resolve(result);
        }, 100);
      });
    };

    [...Array(5)].forEach(() => queue.enqueue(work));
    const final = await queue.enqueue(work);

    expect(final).toEqual(60);
  });

  it('should clear the queue', async () => {
    const work = async () => 'result';

    queue.enqueue(work).catch(noop);
    queue.enqueue(work).catch(noop);
    queue.enqueue(work).catch(noop);

    expect(queue.size).toBe(2); // one work is in progress doesn't count

    queue.clear();

    expect(queue.size).toBe(0);
  });

  it('should cancel the current work', async () => {
    const work = async () => new Promise((resolve) => setTimeout(() => resolve('result'), 100));
    const resultPromise = queue.enqueue(work);
    queue.cancelCurrentWork();

    await expect(resultPromise).rejects.toThrow('Work cancelled');
  });

  it('should cancel the queue', async () => {
    const work = async () => new Promise((resolve) => setTimeout(() => resolve('result'), 100));
    const resultPromise = queue.enqueue(work);
    queue.enqueue(work).catch(noop);
    queue.enqueue(work).catch(noop);

    expect(queue.size).toBe(2);

    queue.cancel();

    await expect(resultPromise).rejects.toThrow('Work cancelled');
    expect(queue.size).toBe(0);
  });
});
