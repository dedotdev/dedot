import { describe, expect, it } from 'vitest';
import { pickInstantiatedEvent } from '../events.js';

describe('pickInstantiatedEvent', () => {
  type Event = { deployer: string; contract: string };
  const bySigner = (signer: string) => (e: Event) => e.deployer === signer;

  it('should return undefined when there are no events', () => {
    expect(pickInstantiatedEvent([], () => true)).toBeUndefined();
    expect(pickInstantiatedEvent(undefined as any, () => true)).toBeUndefined();
  });

  it('should return the only event', () => {
    const events = [{ deployer: 'alice', contract: 'parent' }];
    expect(pickInstantiatedEvent(events, bySigner('alice'))).toBe(events[0]);
  });

  it('should pick the event deployed by the signer, not the first one', () => {
    const events = [
      { deployer: 'parent', contract: 'child' },
      { deployer: 'alice', contract: 'parent' },
    ];

    expect(pickInstantiatedEvent(events, bySigner('alice'))).toBe(events[1]);
  });

  it('should pick the event deployed by the signer regardless of its position', () => {
    const events = [
      { deployer: 'alice', contract: 'parent' },
      { deployer: 'parent', contract: 'child' },
    ];

    expect(pickInstantiatedEvent(events, bySigner('alice'))).toBe(events[0]);
  });

  it('should pick the last matching event if the signer deployed multiple contracts', () => {
    const events = [
      { deployer: 'alice', contract: 'first' },
      { deployer: 'first', contract: 'child' },
      { deployer: 'alice', contract: 'second' },
    ];

    expect(pickInstantiatedEvent(events, bySigner('alice'))).toBe(events[2]);
  });

  it('should fall back to the last event when no event matches the signer', () => {
    const events = [
      { deployer: 'parent', contract: 'child' },
      { deployer: 'proxy', contract: 'parent' },
    ];

    expect(pickInstantiatedEvent(events, bySigner('alice'))).toBe(events[1]);
  });

  it('should fall back to the last event when the matcher throws', () => {
    const events = [
      { deployer: 'parent', contract: 'child' },
      { deployer: 'alice', contract: 'parent' },
    ];

    expect(
      pickInstantiatedEvent(events, () => {
        throw new Error('Unexpected event shape');
      }),
    ).toBe(events[1]);
  });
});
