import { Executor } from './executor/index.js';

export interface Carrier {
  executor: Executor;
  chain?: string[];
}

/**
 * Create a chain of proxy objects
 *
 * @param carrier
 * @param currentLevel
 * @param maxLevel
 */
export const newProxyChain = (carrier: Carrier, currentLevel = 1, maxLevel = 3) => {
  const { executor, chain = [] } = carrier;
  if (currentLevel === maxLevel) {
    return executor.execute(...chain);
  }

  return new Proxy(carrier, {
    get(target: Carrier, property: string | symbol, receiver: any): any {
      const newCarrier: Carrier = {
        executor: target.executor,
        chain: [...(target.chain || []), property.toString()],
      };

      return newProxyChain(newCarrier, currentLevel + 1, maxLevel);
    },
  });
};
