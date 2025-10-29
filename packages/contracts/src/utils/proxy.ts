import { GenericSubstrateApi } from '@dedot/types';
import { Executor } from 'src/executor';

export function newProxyChain<ChainApi extends GenericSubstrateApi>(carrier: Executor): unknown {
  return new Proxy(carrier, {
    get(target: Executor, property: string | symbol): any {
      return target.doExecute(property.toString());
    },
  });
}
