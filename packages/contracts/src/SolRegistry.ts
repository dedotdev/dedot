import { IEventRecord, IRuntimeEvent } from '@dedot/codecs/types';
import { assert, stringCamelCase } from '@dedot/utils';
import { decodeEventLog } from 'viem/utils';
import {
  ContractAddress,
  SolAbi,
  ContractEvent,
  SolAbiFunction,
  SolAbiConstructor,
  SolAbiEvent,
  SolAbiError,
} from './types/index.js';
import { ContractEmittedEvent } from './utils/index.js';

export class SolRegistry {
  constructor(public readonly abi: SolAbi) {}

  findAbiFunction(name: string): SolAbiFunction | undefined {
    return this.abi.find((one) => one.type === 'function' && stringCamelCase(one.name) === name) as SolAbiFunction;
  }

  findTxAbiFunction(name: string): SolAbiFunction | undefined {
    const found = this.findAbiFunction(name);

    if (found && found.stateMutability !== 'view') {
      return found;
    }

    return undefined;
  }

  findAbiConstructor(): SolAbiConstructor {
    let item = this.abi.find((a) => a.type === 'constructor') as SolAbiConstructor;

    return (
      item ||
      ({
        inputs: [],
        stateMutability: 'nonpayable',
        type: 'constructor',
      } as SolAbiConstructor) // Fallback to default constructor
    );
  }

  findAbiEvent(name: string): SolAbiEvent | undefined {
    return this.abi.find((one) => one.type === 'event' && one.name === name) as SolAbiEvent;
  }

  findAbiError(name: string): SolAbiError | undefined {
    return this.abi.find((one) => one.type === 'error' && one.name === name) as SolAbiError;
  }

  decodeEvents(records: IEventRecord[], contract: ContractAddress): ContractEvent[] {
    return records
      .filter((eventRecord) => this.#isContractEmittedEvent(eventRecord.event, contract))
      .map((eventRecord) => this.decodeEvent(eventRecord, contract));
  }

  decodeEvent(eventRecord: IEventRecord, contract: ContractAddress) {
    assert(this.#isContractEmittedEvent(eventRecord.event, contract), 'Invalid ContractEmitted Event');

    const event = eventRecord.event;
    const signatureTopic = event.palletEvent.data.topics[0];

    const { eventName, args: data } = decodeEventLog({
      abi: this.abi,
      data: event.palletEvent.data.data,
      topics: [signatureTopic, ...event.palletEvent.data.topics],
    });

    return data ? { name: eventName, data } : { name: eventName };
  }

  #isContractEmittedEvent(
    event: IRuntimeEvent,
    contractAddress?: ContractAddress,
  ): event is ContractEmittedEvent<'Revive'> {
    const eventMatched =
      typeof event.palletEvent === 'object' && // --
      event.palletEvent.name === 'ContractEmitted';

    if (!eventMatched) return false;

    if (contractAddress) {
      // @ts-ignore
      const emittedContract = event.palletEvent.data?.contract;

      return emittedContract === contractAddress;
    }

    return true;
  }
}
