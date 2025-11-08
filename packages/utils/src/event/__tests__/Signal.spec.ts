import { describe, it, expect, vi } from 'vitest';
import { Signal } from '../Signal';

describe('Signal', () => {
  describe('Constructor', () => {
    it('should create a Signal without initial value', () => {
      const subject = new Signal<number>();
      expect(subject.value).toBeUndefined();
      expect(subject.listenerCount).toBe(0);
    });

    it('should create a Signal with initial value', () => {
      const subject = new Signal<number>(42);
      expect(subject.value).toBe(42);
      expect(subject.listenerCount).toBe(0);
    });

    it('should accept undefined as initial value', () => {
      const subject = new Signal<number | undefined>(undefined);
      expect(subject.value).toBeUndefined();
    });

    it('should accept null as initial value', () => {
      const subject = new Signal<number | null>(null);
      expect(subject.value).toBeNull();
    });
  });

  describe('next()', () => {
    it('should update the current value', () => {
      const subject = new Signal<number>();
      expect(subject.value).toBeUndefined();

      subject.next(42);
      expect(subject.value).toBe(42);

      subject.next(100);
      expect(subject.value).toBe(100);
    });

    it('should notify all subscribers when value is emitted', () => {
      const subject = new Signal<number>();
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      subject.subscribe(callback1);
      subject.subscribe(callback2);

      subject.next(42);

      expect(callback1).toHaveBeenCalledWith(42);
      expect(callback2).toHaveBeenCalledWith(42);
      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledTimes(1);
    });

    it('should not fail if a listener throws an error', () => {
      const subject = new Signal<number>();
      const errorCallback = vi.fn(() => {
        throw new Error('Test error');
      });
      const normalCallback = vi.fn();

      // Spy on console.error to suppress error output in tests
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      subject.subscribe(errorCallback);
      subject.subscribe(normalCallback);

      expect(() => subject.next(42)).not.toThrow();
      expect(errorCallback).toHaveBeenCalledWith(42);
      expect(normalCallback).toHaveBeenCalledWith(42);
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('should emit values to subscribers in order', () => {
      const subject = new Signal<number>();
      const results: number[] = [];

      subject.subscribe((value) => results.push(value * 1));
      subject.subscribe((value) => results.push(value * 2));
      subject.subscribe((value) => results.push(value * 3));

      subject.next(10);

      expect(results).toEqual([10, 20, 30]);
    });
  });

  describe('subscribe()', () => {
    it('should immediately emit current value to new subscriber', () => {
      const subject = new Signal<number>(42);
      const callback = vi.fn();

      subject.subscribe(callback);

      expect(callback).toHaveBeenCalledWith(42);
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should not emit if current value is undefined', () => {
      const subject = new Signal<number>();
      const callback = vi.fn();

      subject.subscribe(callback);

      expect(callback).not.toHaveBeenCalled();
    });

    it('should emit subsequent values to subscriber', () => {
      const subject = new Signal<number>();
      const callback = vi.fn();

      subject.subscribe(callback);
      subject.next(1);
      subject.next(2);
      subject.next(3);

      expect(callback).toHaveBeenCalledTimes(3);
      expect(callback).toHaveBeenNthCalledWith(1, 1);
      expect(callback).toHaveBeenNthCalledWith(2, 2);
      expect(callback).toHaveBeenNthCalledWith(3, 3);
    });

    it('should return an unsubscribe function', () => {
      const subject = new Signal<number>();
      const callback = vi.fn();

      const unsub = subject.subscribe(callback);

      expect(typeof unsub).toBe('function');
    });

    it('should stop receiving values after unsubscribe', () => {
      const subject = new Signal<number>();
      const callback = vi.fn();

      const unsub = subject.subscribe(callback);
      subject.next(1);
      unsub();
      subject.next(2);

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(1);
    });

    it('should handle errors in subscriber callback on subscribe', () => {
      const subject = new Signal<number>(42);
      const errorCallback = vi.fn(() => {
        throw new Error('Test error');
      });

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => subject.subscribe(errorCallback)).not.toThrow();
      expect(errorCallback).toHaveBeenCalledWith(42);
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('should support multiple subscribers', () => {
      const subject = new Signal<string>('initial');
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      const callback3 = vi.fn();

      subject.subscribe(callback1);
      subject.subscribe(callback2);
      subject.subscribe(callback3);

      expect(callback1).toHaveBeenCalledWith('initial');
      expect(callback2).toHaveBeenCalledWith('initial');
      expect(callback3).toHaveBeenCalledWith('initial');

      subject.next('updated');

      expect(callback1).toHaveBeenCalledWith('updated');
      expect(callback2).toHaveBeenCalledWith('updated');
      expect(callback3).toHaveBeenCalledWith('updated');
    });

    it('should allow resubscribing after unsubscribe', () => {
      const subject = new Signal<number>(0);
      const callback = vi.fn();

      const unsub1 = subject.subscribe(callback);
      unsub1();

      callback.mockClear();

      const unsub2 = subject.subscribe(callback);
      subject.next(1);

      expect(callback).toHaveBeenCalledTimes(2); // Initial + next
      expect(callback).toHaveBeenNthCalledWith(1, 0); // Got current value
      expect(callback).toHaveBeenNthCalledWith(2, 1); // Got new value

      unsub2();
    });
  });

  describe('listenerCount', () => {
    it('should start at 0', () => {
      const subject = new Signal<number>();
      expect(subject.listenerCount).toBe(0);
    });

    it('should increment when subscribers are added', () => {
      const subject = new Signal<number>();

      subject.subscribe(() => {});
      expect(subject.listenerCount).toBe(1);

      subject.subscribe(() => {});
      expect(subject.listenerCount).toBe(2);

      subject.subscribe(() => {});
      expect(subject.listenerCount).toBe(3);
    });

    it('should decrement when subscribers unsubscribe', () => {
      const subject = new Signal<number>();

      const unsub1 = subject.subscribe(() => {});
      const unsub2 = subject.subscribe(() => {});
      const unsub3 = subject.subscribe(() => {});

      expect(subject.listenerCount).toBe(3);

      unsub1();
      expect(subject.listenerCount).toBe(2);

      unsub2();
      expect(subject.listenerCount).toBe(1);

      unsub3();
      expect(subject.listenerCount).toBe(0);
    });

    it('should handle calling unsubscribe multiple times', () => {
      const subject = new Signal<number>();
      const unsub = subject.subscribe(() => {});

      expect(subject.listenerCount).toBe(1);
      unsub();
      expect(subject.listenerCount).toBe(0);
      unsub(); // Second call should be safe
      expect(subject.listenerCount).toBe(0);
    });
  });

  describe('value', () => {
    it('should return undefined when no value has been set', () => {
      const subject = new Signal<number>();
      expect(subject.value).toBeUndefined();
    });

    it('should return the initial value', () => {
      const subject = new Signal<string>('hello');
      expect(subject.value).toBe('hello');
    });

    it('should return the last emitted value', () => {
      const subject = new Signal<number>(0);
      expect(subject.value).toBe(0);

      subject.next(1);
      expect(subject.value).toBe(1);

      subject.next(2);
      expect(subject.value).toBe(2);
    });

    it('should persist value after all subscribers unsubscribe', () => {
      const subject = new Signal<number>(42);
      const unsub = subject.subscribe(() => {});

      expect(subject.value).toBe(42);
      unsub();
      expect(subject.value).toBe(42); // Value still available
    });
  });

  describe('Type support', () => {
    it('should work with primitive types', () => {
      const numberSignal = new Signal<number>(42);
      const stringSignal = new Signal<string>('hello');
      const booleanSignal = new Signal<boolean>(true);

      expect(numberSignal.value).toBe(42);
      expect(stringSignal.value).toBe('hello');
      expect(booleanSignal.value).toBe(true);
    });

    it('should work with object types', () => {
      interface User {
        name: string;
        age: number;
      }

      const subject = new Signal<User>({ name: 'Alice', age: 30 });
      expect(subject.value).toEqual({ name: 'Alice', age: 30 });

      const callback = vi.fn();
      subject.subscribe(callback);
      subject.next({ name: 'Bob', age: 25 });

      expect(callback).toHaveBeenCalledWith({ name: 'Bob', age: 25 });
    });

    it('should work with union types', () => {
      const subject = new Signal<number | string>(42);
      expect(subject.value).toBe(42);

      subject.next('hello');
      expect(subject.value).toBe('hello');
    });

    it('should work with nullable types', () => {
      const subject = new Signal<number | null>(null);
      expect(subject.value).toBeNull();

      subject.next(42);
      expect(subject.value).toBe(42);

      subject.next(null);
      expect(subject.value).toBeNull();
    });
  });

  describe('Memory and cleanup', () => {
    it('should remove listener reference on unsubscribe', () => {
      const subject = new Signal<number>();
      const callback = vi.fn();

      const unsub = subject.subscribe(callback);
      expect(subject.listenerCount).toBe(1);

      unsub();
      expect(subject.listenerCount).toBe(0);

      // Emitting should not call the unsubscribed callback
      subject.next(1);
      expect(callback).not.toHaveBeenCalled();
    });

    it('should handle many subscribers efficiently', () => {
      const subject = new Signal<number>(0);
      const unsubscribers: Array<() => void> = [];

      // Add 1000 subscribers
      for (let i = 0; i < 1000; i++) {
        const unsub = subject.subscribe(() => {});
        unsubscribers.push(unsub);
      }

      expect(subject.listenerCount).toBe(1000);

      // Unsubscribe all
      unsubscribers.forEach((unsub) => unsub());

      expect(subject.listenerCount).toBe(0);
    });
  });

  describe('Real-world scenarios', () => {
    it('should work as a state management tool', () => {
      interface AppState {
        count: number;
        user: string;
      }

      const state = new Signal<AppState>({ count: 0, user: 'Guest' });
      const updates: AppState[] = [];

      state.subscribe((value) => updates.push(value));

      state.next({ count: 1, user: 'Guest' });
      state.next({ count: 2, user: 'Alice' });
      state.next({ count: 3, user: 'Alice' });

      expect(updates).toHaveLength(4); // Initial + 3 updates
      expect(updates[updates.length - 1]).toEqual({ count: 3, user: 'Alice' });
    });

    it('should work as a data cache with immediate access', () => {
      const cache = new Signal<number>(100);

      // First consumer gets immediate value
      const consumer1 = vi.fn();
      cache.subscribe(consumer1);
      expect(consumer1).toHaveBeenCalledWith(100);

      // Update cache
      cache.next(200);

      // Second consumer gets latest value immediately
      const consumer2 = vi.fn();
      cache.subscribe(consumer2);
      expect(consumer2).toHaveBeenCalledWith(200);
    });
  });
});
