import { EventEmitter as EE } from 'eventemitter3';

type Unsub = () => void;
type HandlerFn = (...args: any[]) => void;

export interface IEventEmitter<EventTypes extends string = string> {
  on(event: EventTypes, handler: HandlerFn): Unsub;
  once(event: EventTypes, handler: HandlerFn): Unsub;
  off(event: EventTypes, handler?: HandlerFn): this;
}

export class EventEmitter<EventTypes extends string = string> implements IEventEmitter<EventTypes> {
  #emitter: EE;

  constructor() {
    this.#emitter = new EE();
  }

  protected emit(event: EventTypes, ...args: any[]): boolean {
    return this.#emitter.emit(event, ...args);
  }

  protected clearEvents() {
    this.#emitter.removeAllListeners();
  }

  public on(event: EventTypes, handler: HandlerFn): Unsub {
    this.#emitter.on(event, handler);

    return () => {
      this.off(event, handler);
    };
  }

  public once(event: EventTypes, handler: HandlerFn): Unsub {
    this.#emitter.once(event, handler);

    return () => {
      this.off(event, handler);
    };
  }

  public off(event: EventTypes, handler?: HandlerFn): this {
    this.#emitter.off(event, handler);

    return this;
  }
}
