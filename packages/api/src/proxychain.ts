import { Executor } from "./executor";

export interface Carrier {
  executor: Executor;
  chain?: string[];
}

export const newProxyChain = (carrier: Carrier, currentLevel = 1, maxLevel = 3) => {
  const { executor, chain = [] } = carrier;
  if (currentLevel === maxLevel) {
    return executor.execute(...chain);
  }

  return new Proxy(carrier, {
    get(target: Carrier, property: string | symbol, receiver: any): any {
      if (!target.chain) {
        target.chain = [];
      }

      const { chain } = target;

      chain.push(property.toString());

      return newProxyChain(target, currentLevel + 1);
    },
  });
};
