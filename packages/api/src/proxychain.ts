import { GenericSubstrateApi } from '@dedot/types';
import { Executor } from './executor/index.js';

export interface Carrier<ChainApi extends GenericSubstrateApi> {
  executor: Executor<ChainApi>;
  chain?: string[];
}

/**
 * Create a chain of proxy objects
 *
 * @param carrier
 * @param currentLevel
 * @param maxLevel
 */
export const newProxyChain = <ChainApi extends GenericSubstrateApi>(
  carrier: Carrier<ChainApi>,
  currentLevel = 1,
  maxLevel = 3,
) => {
  const { executor, chain = [] } = carrier;
  if (currentLevel === maxLevel) {
    return executor.execute(...chain);
  }

  return new Proxy(carrier, {
    get(target: Carrier<ChainApi>, property: string | symbol, receiver: any): any {
      if (!target.chain) {
        target.chain = [];
      }

      const { chain } = target;

      chain.push(property.toString());

      return newProxyChain<ChainApi>(target, currentLevel + 1);
    },
  });
};
