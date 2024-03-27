import { EventEmitter as EE } from 'eventemitter3';

type HandlerFn = (...args: any[]) => void;

export interface IEventEmitter<EventTypes extends string = string> {
  on(event: EventTypes, handler: HandlerFn): this;
  once(event: EventTypes, handler: HandlerFn): this;
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

  public on(event: EventTypes, handler: HandlerFn): this {
    this.#emitter.on(event, handler);

    return this;
  }

  public once(event: EventTypes, handler: HandlerFn): this {
    this.#emitter.once(event, handler);

    return this;
  }

  public off(event: EventTypes, handler?: HandlerFn): this {
    this.#emitter.off(event, handler);

    return this;
  }
}
