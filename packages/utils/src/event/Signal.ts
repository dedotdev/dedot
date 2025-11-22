type Unsub = () => void;
type Callback<T> = (value: T) => void;

/**
 * Signal - A reactive value container with automatic notification
 *
 * Signal is a reactive primitive that holds a value and notifies subscribers when it changes.
 * It maintains the current value and immediately emits it to new subscribers.
 *
 * Features:
 * - Stores the current value
 * - Immediately emits the current value to new subscribers
 * - Tracks the number of active listeners
 * - Prevents one listener's error from affecting others
 *
 * @example
 * ```typescript
 * const signal = new Signal<number>(0);
 *
 * // Subscribe and get current value immediately
 * const unsub = signal.subscribe((value) => {
 *   console.log(value); // Logs: 0
 * });
 *
 * // Emit new value to all subscribers
 * signal.next(42); // All subscribers receive 42
 *
 * // Cleanup
 * unsub();
 * ```
 *
 * @template T The type of values emitted by this Signal
 */
export class Signal<T> {
  #value?: T;
  #listeners: Set<Callback<T>>;

  /**
   * Creates a new Signal
   *
   * @param initialValue Optional initial value to store
   */
  constructor(initialValue?: T) {
    this.#value = initialValue;
    this.#listeners = new Set();
  }

  /**
   * Emit a new value to all subscribers
   *
   * Updates the current value and notifies all listeners.
   * If a listener throws an error, it's caught and logged to prevent
   * breaking other listeners.
   *
   * @param value The value to emit
   *
   * @example
   * ```typescript
   * const subject = new Signal<string>('hello');
   * subject.next('world'); // All subscribers receive 'world'
   * ```
   */
  next(value: T): void {
    this.#value = value;
    this.#listeners.forEach((listener) => {
      try {
        listener(value);
      } catch (error) {
        // Swallow errors to prevent one listener from breaking others
        console.error('Error in Signal listener:', error);
      }
    });
  }

  /**
   * Subscribe to value changes
   *
   * The callback is immediately invoked with the current value (if defined),
   * then invoked again whenever a new value is emitted via `next()`.
   *
   * @param callback Function to call when values are emitted
   * @returns Unsubscribe function to stop receiving updates
   *
   * @example
   * ```typescript
   * const subject = new Signal<number>(5);
   *
   * const unsub = subject.subscribe((value) => {
   *   console.log(value); // Immediately logs: 5
   * });
   *
   * subject.next(10); // Logs: 10
   * unsub(); // Stop receiving updates
   * subject.next(15); // No log (unsubscribed)
   * ```
   */
  subscribe(callback: Callback<T>): Unsub {
    // Immediately emit current value to new subscriber
    if (this.#value !== undefined) {
      try {
        callback(this.#value);
      } catch (error) {
        console.error('Error in Signal subscriber callback:', error);
      }
    }

    this.#listeners.add(callback);

    // Return unsubscribe function
    return () => {
      this.#listeners.delete(callback);
    };
  }

  /**
   * Get the number of active listeners
   *
   * Useful for tracking subscriptions and implementing cleanup logic.
   *
   * @returns The number of active subscribers
   *
   * @example
   * ```typescript
   * const subject = new Signal<number>();
   * console.log(subject.listenerCount); // 0
   *
   * const unsub1 = subject.subscribe(() => {});
   * const unsub2 = subject.subscribe(() => {});
   * console.log(subject.listenerCount); // 2
   *
   * unsub1();
   * console.log(subject.listenerCount); // 1
   * ```
   */
  get listenerCount(): number {
    return this.#listeners.size;
  }

  /**
   * Get the current value
   *
   * Returns the last value emitted via `next()`, or the initial value
   * if no values have been emitted yet.
   *
   * @returns The current value, or undefined if no value has been set
   *
   * @example
   * ```typescript
   * const subject = new Signal<number>(42);
   * console.log(subject.value); // 42
   *
   * subject.next(100);
   * console.log(subject.value); // 100
   * ```
   */
  get value(): T | undefined {
    return this.#value;
  }
}
