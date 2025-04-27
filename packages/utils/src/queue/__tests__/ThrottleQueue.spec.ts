import { describe, it, beforeEach, expect, vi } from 'vitest';
import { ThrottleQueue } from '../ThrottleQueue.js';

describe('ThrottleQueue', () => {
  let queue: ThrottleQueue;

  beforeEach(() => {
    queue = new ThrottleQueue(2); // Limit to 2 concurrent tasks
  });

  it('should execute tasks concurrently up to the limit', async () => {
    const results: number[] = [];
    const createTask = (id: number) => async () => {
      results.push(id);
      await new Promise(resolve => setTimeout(resolve, 50));
      return id;
    };

    // Start 3 tasks (third should be queued)
    const task1 = queue.add(createTask(1));
    const task2 = queue.add(createTask(2));
    const task3 = queue.add(createTask(3));

    // First two should start immediately
    expect(results).toEqual([1, 2]);
    expect(queue.runningCount).toBe(2);
    expect(queue.size).toBe(1); // One task queued

    // Wait for all tasks to complete
    const allResults = await Promise.all([task1, task2, task3]);
    
    expect(allResults).toEqual([1, 2, 3]);
    expect(queue.runningCount).toBe(0);
    expect(queue.size).toBe(0);
  });

  it('should cancel all pending tasks and reset the queue', async () => {
    const createTask = (id: number) => async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
      return id;
    };

    // Start tasks that will fill the queue
    const task1 = queue.add(createTask(1));
    const task2 = queue.add(createTask(2));
    
    // These will be queued
    const task3Promise = queue.add(createTask(3));
    const task4Promise = queue.add(createTask(4));
    
    // Cancel all pending tasks
    queue.cancel();
    
    // Running tasks should complete
    await expect(task1).resolves.toBe(1);
    await expect(task2).resolves.toBe(2);
    
    // Queued tasks should be rejected
    await expect(task3Promise).rejects.toThrow('Queue has been cancelled');
    await expect(task4Promise).rejects.toThrow('Queue has been cancelled');
    
    // Queue should be empty
    expect(queue.size).toBe(0);
    
    // New tasks should be accepted immediately after cancel
    await expect(queue.add(createTask(5))).resolves.toBe(5);
    
    // Check active state
    expect(queue.active).toBe(true);
  });

  describe('constructor', () => {
    it('should work with minimum concurrency (1)', async () => {
      const singleQueue = new ThrottleQueue(1);
      const results: number[] = [];
      
      const createTask = (id: number) => async () => {
        results.push(id);
        await new Promise(resolve => setTimeout(resolve, 20));
        return id;
      };
      
      // Add multiple tasks
      const task1 = singleQueue.add(createTask(1));
      const task2 = singleQueue.add(createTask(2));
      
      // Only the first task should start immediately
      expect(results).toEqual([1]);
      expect(singleQueue.runningCount).toBe(1);
      expect(singleQueue.size).toBe(1);
      
      // Wait for all tasks to complete
      const allResults = await Promise.all([task1, task2]);
      
      expect(allResults).toEqual([1, 2]);
      expect(singleQueue.runningCount).toBe(0);
      expect(singleQueue.size).toBe(0);
    });
    
    it('should work with large concurrency values', async () => {
      const largeQueue = new ThrottleQueue(100);
      const results: number[] = [];
      
      const createTask = (id: number) => async () => {
        results.push(id);
        await new Promise(resolve => setTimeout(resolve, 10));
        return id;
      };
      
      // Add multiple tasks (less than the concurrency limit)
      const promises = Array.from({ length: 10 }, (_, i) => 
        largeQueue.add(createTask(i + 1))
      );
      
      // All tasks should start immediately
      expect(results.length).toBe(10);
      expect(largeQueue.runningCount).toBe(10);
      expect(largeQueue.size).toBe(0);
      
      // Wait for all tasks to complete
      await Promise.all(promises);
      
      expect(largeQueue.runningCount).toBe(0);
    });
  });

  describe('task execution order', () => {
    it('should execute tasks in the order they were added', async () => {
      const executionOrder: number[] = [];
      const completionOrder: number[] = [];
      
      // Create tasks with varying execution times to test order
      const createTask = (id: number, delay: number) => async () => {
        executionOrder.push(id);
        await new Promise(resolve => setTimeout(resolve, delay));
        completionOrder.push(id);
        return id;
      };
      
      // Add tasks with different execution times
      const task1 = queue.add(createTask(1, 50)); // Completes second
      const task2 = queue.add(createTask(2, 30)); // Completes first
      const task3 = queue.add(createTask(3, 10)); // Queued, completes third
      
      // First two should execute in order added
      expect(executionOrder).toEqual([1, 2]);
      
      // Wait for all tasks to complete
      await Promise.all([task1, task2, task3]);
      
      // Execution order should match the order tasks were added
      expect(executionOrder).toEqual([1, 2, 3]);
      
      // Completion order should be based on execution time
      expect(completionOrder).toEqual([2, 3, 1]);
    });
  });

  describe('error handling', () => {
    it('should propagate errors from tasks', async () => {
      const errorTask = async () => {
        throw new Error('Task error');
      };
      
      await expect(queue.add(errorTask)).rejects.toThrow('Task error');
    });
    
    it('should continue processing queue after a task fails', async () => {
      const results: number[] = [];
      
      const successTask = async () => {
        results.push(1);
        return 1;
      };
      
      const errorTask = async () => {
        throw new Error('Task error');
      };
      
      const anotherSuccessTask = async () => {
        results.push(2);
        return 2;
      };
      
      // Add a mix of successful and failing tasks
      const task1 = queue.add(successTask);
      const task2 = queue.add(errorTask).catch(() => 'error handled');
      const task3 = queue.add(anotherSuccessTask);
      
      // Wait for all tasks to complete or fail
      await Promise.all([task1, task2, task3]);
      
      // Both successful tasks should have executed
      expect(results).toEqual([1, 2]);
      expect(queue.runningCount).toBe(0);
      expect(queue.size).toBe(0);
    });
  });

  describe('cancellation scenarios', () => {
    it('should handle cancelling an empty queue', async () => {
      const emptyQueue = new ThrottleQueue(2);
      
      // Cancel with no tasks
      emptyQueue.cancel();
      
      expect(emptyQueue.size).toBe(0);
      expect(emptyQueue.runningCount).toBe(0);
      expect(emptyQueue.active).toBe(true);
      
      // Should still accept new tasks
      const result = await emptyQueue.add(async () => 'success');
      expect(result).toBe('success');
    });
    
    it('should handle cancelling with only running tasks', async () => {
      const results: string[] = [];
      
      const createTask = (id: string) => async () => {
        results.push(`start-${id}`);
        await new Promise(resolve => setTimeout(resolve, 50));
        results.push(`end-${id}`);
        return id;
      };
      
      // Add tasks up to concurrency limit
      const task1 = queue.add(createTask('task1'));
      const task2 = queue.add(createTask('task2'));
      
      // Cancel (should only affect queued tasks, not running ones)
      queue.cancel();
      
      // Running tasks should complete normally
      await expect(task1).resolves.toBe('task1');
      await expect(task2).resolves.toBe('task2');
      
      expect(results).toContain('start-task1');
      expect(results).toContain('start-task2');
      expect(results).toContain('end-task1');
      expect(results).toContain('end-task2');
    });
  });

  describe('concurrency control', () => {
    it('should respect exact concurrency limits with rapidly added tasks', async () => {
      const executionStarts: number[] = [];
      const maxConcurrent = 3;
      const totalTasks = 10;
      
      const concurrentQueue = new ThrottleQueue(maxConcurrent);
      
      const createTask = (id: number) => async () => {
        executionStarts.push(id);
        await new Promise(resolve => setTimeout(resolve, 20));
        return id;
      };
      
      // Add tasks rapidly
      const promises = Array.from({ length: totalTasks }, (_, i) => 
        concurrentQueue.add(createTask(i + 1))
      );
      
      // Only maxConcurrent tasks should have started
      expect(executionStarts.length).toBe(maxConcurrent);
      expect(concurrentQueue.runningCount).toBe(maxConcurrent);
      expect(concurrentQueue.size).toBe(totalTasks - maxConcurrent);
      
      // Wait for all tasks to complete
      await Promise.all(promises);
      
      // All tasks should have executed
      expect(executionStarts.length).toBe(totalTasks);
      expect(concurrentQueue.runningCount).toBe(0);
      expect(concurrentQueue.size).toBe(0);
    });
    
    it('should handle tasks with varying durations', async () => {
      const executionOrder: number[] = [];
      const completionOrder: number[] = [];
      
      const concurrentQueue = new ThrottleQueue(2);
      
      const createTask = (id: number, duration: number) => async () => {
        executionOrder.push(id);
        await new Promise(resolve => setTimeout(resolve, duration));
        completionOrder.push(id);
        return id;
      };
      
      // Add tasks with different durations
      const task1 = concurrentQueue.add(createTask(1, 100)); // Long task
      const task2 = concurrentQueue.add(createTask(2, 20));  // Short task
      const task3 = concurrentQueue.add(createTask(3, 10));  // Queued, very short task
      
      // First two should start immediately
      expect(executionOrder).toEqual([1, 2]);
      
      // Wait for all tasks to complete
      await Promise.all([task1, task2, task3]);
      
      // Short tasks should complete before long tasks
      expect(completionOrder).toEqual([2, 3, 1]);
    });
  });

  describe('state tracking', () => {
    it('should accurately track size, runningCount, and active properties', async () => {
      const createTask = (delay: number) => async () => {
        await new Promise(resolve => setTimeout(resolve, delay));
        return delay;
      };
      
      // Initial state
      expect(queue.size).toBe(0);
      expect(queue.runningCount).toBe(0);
      expect(queue.active).toBe(true);
      
      // Add tasks up to concurrency limit
      const task1 = queue.add(createTask(50));
      const task2 = queue.add(createTask(50));
      
      // Add more tasks that will be queued
      const task3 = queue.add(createTask(10));
      const task4 = queue.add(createTask(10));
      
      // Check state after adding tasks
      expect(queue.size).toBe(2); // Two tasks queued
      expect(queue.runningCount).toBe(2); // Two tasks running
      expect(queue.active).toBe(true);
      
      // Cancel pending tasks
      queue.cancel();
      
      // Check state after cancellation
      expect(queue.size).toBe(0); // Queue should be empty
      expect(queue.runningCount).toBe(2); // Running tasks continue
      expect(queue.active).toBe(true); // Queue should be active again
      
      // Wait for running tasks to complete
      await Promise.all([task1, task2]);
      
      // Check final state
      expect(queue.size).toBe(0);
      expect(queue.runningCount).toBe(0);
      expect(queue.active).toBe(true);
    });
  });
});
