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
});
