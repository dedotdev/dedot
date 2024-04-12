import { Dedot } from 'dedot';
import { AccountId32 } from '@dedot/codecs';
import { ContractMetadata, GenericContractApi } from '../types';
import { QueryExecutor } from './QueryExecutor';
import Executor from './Executor';
import { TxExecutor } from './TxExecutor';

export class ContractPromise<ContractApi extends GenericContractApi> {
  api: Dedot;
  address: AccountId32;
  metadata: ContractMetadata;

  constructor(api: Dedot, address: AccountId32 | string, metadata: ContractMetadata | string) {
    this.api = api;
    this.address = new AccountId32(address);

    if (typeof metadata === 'string') {
      this.metadata = JSON.parse(metadata) as ContractMetadata;
    } else {
      this.metadata = metadata;
    }
  }

  get query(): ContractApi['query'] {
    return new Proxy(new QueryExecutor(this.api, this.metadata, this.address), {
      get(target: Executor, property: string | symbol, receiver: any): any {
        return target.doExecute(property.toString());
      },
    }) as unknown as ContractApi['query'];
  }

  get tx(): ContractApi['tx'] {
    return new Proxy(new TxExecutor(this.api, this.metadata, this.address), {
      get(target: Executor, property: string | symbol, receiver: any): any {
        return target.doExecute(property.toString());
      },
    }) as unknown as ContractApi['tx'];
  }
}
