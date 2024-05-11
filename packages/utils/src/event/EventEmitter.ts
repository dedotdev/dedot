import { EventEmitter as EE } from 'eventemitter3';

type Unsub = () => void;
type HandlerFn = (...args: any[]) => void;

export interface IEventEmitter<EventTypes extends string = string> {
  on(event: EventTypes, handler: HandlerFn): Unsub;
  once(event: EventTypes, handler: HandlerFn): Unsub;
  off(event: EventTypes, handler?: HandlerFn): this;
}

const handlerWrapper = (handler: HandlerFn): HandlerFn => {
  return (...args: any[]) => {
    try {
      handler(...args);
    } catch (e) {
      console.error(e);
    }
  };
};

export class EventEmitter<EventTypes extends string = string> implements IEventEmitter<EventTypes> {
  #emitter: EE;
  #mapper: Map<HandlerFn, HandlerFn>;

  constructor() {
    this.#emitter = new EE();
    this.#mapper = new Map();
  }

  emit(event: EventTypes, ...args: any[]): boolean {
    return this.#emitter.emit(event, ...args);
  }

  protected clearEvents() {
    this.#emitter.removeAllListeners();
    this.#mapper.clear();
  }

  public on(event: EventTypes, handler: HandlerFn): Unsub {
    const wrapper = handlerWrapper(handler);
    this.#mapper.set(handler, wrapper);
    this.#emitter.on(event, wrapper);

    return () => {
      this.off(event, handler);
    };
  }

  public once(event: EventTypes, handler: HandlerFn): Unsub {
    const wrapper = handlerWrapper(handler);
    this.#mapper.set(handler, wrapper);

    this.#emitter.once(event, wrapper);

    return () => {
      this.off(event, handler);
    };
  }

  public off(event: EventTypes, handler?: HandlerFn): this {
    const wrapper = handler ? this.#mapper.get(handler) : undefined;
    this.#emitter.off(event, wrapper);

    return this;
  }
}
