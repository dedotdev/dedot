import { GenericSubstrateApi } from '@delightfuldot/types';
import { Executor } from './executor';

export interface Carrier<ChainApi extends GenericSubstrateApi> {
  executor: Executor<ChainApi>;
  chain?: string[];
}

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
