import { BestBlockChanged, ChainHeadRuntimeVersion, Finalized, Initialized, NewBlock } from '@dedot/specs';
import { HexString, isNumber, numberToHex, stringToHex } from '@dedot/utils';
import { SubstrateRuntimeVersion } from 'dedot';
import MockProvider, { MockedRuntimeVersion } from 'dedot/client/__tests__/MockProvider';

const rpcMethods = [
  'chainHead_v1_body',
  'chainHead_v1_call',
  'chainHead_v1_continue',
  'chainHead_v1_follow',
  'chainHead_v1_header',
  'chainHead_v1_stopOperation',
  'chainHead_v1_storage',
  'chainHead_v1_unpin',
  'chainHead_v1_unfollow',
  'chainSpec_v1_chainName',
  'chainSpec_v1_genesisHash',
  'chainSpec_v1_properties',
  'transaction_v1_broadcast',
  'transaction_v1_stop',
];

type SimulatorConfig = {
  provider: MockProvider;
  initialRuntime?: SubstrateRuntimeVersion;
  numOfFinalizedBlocks?: number;
};

export const mockedRuntime: ChainHeadRuntimeVersion = {
  ...MockedRuntimeVersion,
  apis: {
    ...MockedRuntimeVersion.apis.reduce(
      (acc, [name, version]) => {
        acc[name] = version;
        return acc;
      },
      {} as Record<string, number>,
    ),
    '0xdf6acb689907609b': 4, // Core v4
    '0xd2bc9897eed08f15': 3, // TaggedTransactionQueue v3
  },
};

export const newChainHeadSimulator = ({ numOfFinalizedBlocks = 15, provider, initialRuntime }: SimulatorConfig) => {
  let runtime = initialRuntime || mockedRuntime;
  let subscriptionId = stringToHex('followSubscription');

  provider.setRpcRequests({
    rpc_methods: () => ({ methods: rpcMethods }),
    chainHead_v1_follow: () => subscriptionId,
    chainHead_v1_unfollow: () => null,
    chainHead_v1_body: () => '0x',
    chainHead_v1_call: () => '0x',
    chainHead_v1_continue: () => '0x',
    chainHead_v1_header: () => '0x',
    chainHead_v1_storage: () => '0x',
    chainHead_v1_stopOperation: () => '0x',
    chainHead_v1_unpin: () => '0x',
    chainSpec_v1_genesisHash: () => '0x0000000000000000000000000000000000000000000000000000000000000000',
    chainSpec_v1_chainName: () => 'MockedChain',
  });

  let finalizedHeight = -1;
  let bestBlockHeight = -1;
  let newBlockHeight = -1;

  type BlockInfo = { height: number; hash: HexString; parent: HexString; forkCounter?: number };
  const blockDb: Record<HexString, BlockInfo> = {}; // <height, {hash, parent}>
  const forkCounter: Record<number, number> = {}; // <height, forkCount>

  const findBlock = (height: number, forkCounter?: number): BlockInfo => {
    const b = Object.values(blockDb).find((block) => block.height === height && block.forkCounter === forkCounter);
    if (!b) throw new Error('Cannot find block');
    return b;
  };

  const newBlockAtHeight = (height: number, forkCounter?: number, parentForkCounter?: number): BlockInfo => {
    if (height === 0) {
      return {
        height,
        hash: '0x00' as HexString,
        parent: '0x00' as HexString,
      };
    }

    const suffix = isNumber(forkCounter) ? `-${forkCounter}` : '';
    const hash = `${numberToHex(height)}${suffix}` as HexString;

    if (blockDb[hash]) return blockDb[hash];

    const parent: any = newBlockAtHeight(height - 1, parentForkCounter);

    blockDb[hash] = {
      height,
      hash: hash as HexString,
      parent: parent.hash as HexString,
      forkCounter,
    };

    return blockDb[hash];
  };

  const newBlock = (fork = false, parentForkCounter?: number) => {
    if (fork) {
      forkCounter[newBlockHeight] = (forkCounter[newBlockHeight] || 0) + 1;
      return newBlockAtHeight(newBlockHeight, forkCounter[newBlockHeight], parentForkCounter);
    } else {
      newBlockHeight += 1;
      return newBlockAtHeight(newBlockHeight, undefined, parentForkCounter);
    }
  };

  const initializedEvent: Initialized = {
    event: 'initialized',
    finalizedBlockHashes: [...Array(numOfFinalizedBlocks)].map(() => newBlock().hash),
    finalizedBlockRuntime: { type: 'valid', spec: runtime },
  };

  finalizedHeight = bestBlockHeight = numOfFinalizedBlocks - 1;

  const nextMockedRuntime = (): SubstrateRuntimeVersion => {
    runtime = { ...runtime, specVersion: runtime.specVersion + 1 };
    return runtime;
  };

  type NewNextBlock = {
    fork?: boolean;
    fromWhichParentFork?: number;
    withRuntime?: boolean;
  };

  const nextNewBlock = (config?: NewNextBlock): NewBlock => {
    const { fork = false, fromWhichParentFork, withRuntime = false } = config || {};
    const block = newBlock(fork, fromWhichParentFork);

    return {
      event: 'newBlock',
      blockHash: block.hash,
      parentBlockHash: block.parent,
      newRuntime: withRuntime ? { type: 'valid', spec: nextMockedRuntime() } : null,
    };
  };

  // TODO simulate forks
  const nextBestBlock = (increaseHeight = true, forkCounter?: number): BestBlockChanged => {
    if (newBlockHeight <= bestBlockHeight) {
      throw new Error('No new block available');
    }

    if (increaseHeight) {
      bestBlockHeight += 1;
    }

    let block = findBlock(bestBlockHeight, forkCounter);

    return {
      event: 'bestBlockChanged',
      bestBlockHash: block.hash,
    };
  };

  const nextFinalized = (forkCounter?: number, withPruned: boolean | HexString[] = true): Finalized => {
    if (bestBlockHeight <= finalizedHeight) {
      throw new Error('No best block to finalize');
    }

    finalizedHeight += 1;
    const block = findBlock(finalizedHeight, forkCounter);

    // find other forked blocks at the same height for pruning
    let prunedBlockHashes = Object.values(blockDb)
      .filter((b) => b.height === finalizedHeight && b.forkCounter !== forkCounter)
      .map((b) => b.hash);

    prunedBlockHashes.forEach((hash) => delete blockDb[hash]);
    if (!withPruned) {
      prunedBlockHashes = [];
    } else if (Array.isArray(withPruned)) {
      prunedBlockHashes = prunedBlockHashes.concat(withPruned);
    }

    return {
      event: 'finalized',
      finalizedBlockHashes: [block.hash],
      prunedBlockHashes,
    };
  };

  const notify = (data: Error | any, timeout = 0) => {
    setTimeout(() => {
      provider.notify(subscriptionId, data);
    }, timeout);

    return data;
  };

  let stopCounter = 0;
  const stop = (
    updateInitialized = false,
    after?: number,
  ): { newSubscriptionId: HexString; initializedEvent: Initialized } => {
    stopCounter += 1;
    const newSubscriptionId = stringToHex('followSubscription' + stopCounter);

    provider.setRpcRequests({
      chainHead_v1_follow: () => newSubscriptionId,
    });

    notify({ event: 'stop' }, after);

    const getInitializedEvent = (): Initialized => {
      if (updateInitialized) {
        const finalizedBlockHashes = [...Array(numOfFinalizedBlocks)].map(() => newBlock().hash);

        console.log('finalizedBlockHashes', finalizedBlockHashes);

        return {
          event: 'initialized',
          finalizedBlockHashes,
          finalizedBlockRuntime: { type: 'valid', spec: nextMockedRuntime() },
        };
      }

      return initializedEvent;
    };

    return {
      newSubscriptionId,
      initializedEvent: getInitializedEvent(),
    };
  };

  return {
    subscriptionId,
    runtime,
    initializedEvent,
    nextNewBlock,
    nextBestBlock,
    nextFinalized,
    notify,
    rpcMethods,
    stop,
    blockDb,
  };
};
