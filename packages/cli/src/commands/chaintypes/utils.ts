import { rpc } from '@polkadot/types-support/metadata/static-substrate';
import staticSubstrate from '@polkadot/types-support/metadata/v15/substrate-hex';
import { ConstantExecutor, DedotClient } from '@dedot/api';
import { $Metadata, Metadata, PortableRegistry, RuntimeVersion, unwrapOpaqueMetadata } from '@dedot/codecs';
import { WsProvider } from '@dedot/providers';
import * as $ from '@dedot/shape';
import { HexString, hexToU8a, isHex } from '@dedot/utils';
import { getMetadataFromWasmRuntime } from '@dedot/wasm';
import * as fs from 'fs';
import ora from 'ora';
import { setPriority } from 'os';
import { DecodedMetadataInfo, ParsedResult } from './types.js';

export const getRuntimeVersion = (metadata: Metadata): RuntimeVersion => {
  const registry = new PortableRegistry(metadata.latest);
  const executor = new ConstantExecutor({
    registry,
    metadata,
  } as any);

  return executor.execute('system', 'version') as RuntimeVersion;
};

export const decodeMetadata = (metadata: HexString | Uint8Array): DecodedMetadataInfo => {
  const decodedMetadata = $Metadata.tryDecode(metadata);
  const runtimeVersion = getRuntimeVersion(decodedMetadata);
  const apis: Record<string, number> = runtimeVersion.apis.reduce(
    (acc, [name, version]) => {
      acc[name] = version;
      return acc;
    },
    {} as Record<string, number>,
  );

  return {
    metadata: decodedMetadata,
    runtimeVersion: {
      ...runtimeVersion,
      apis,
    },
  };
};

export const parseMetadataFromRaw = async (metadataFile: string): Promise<ParsedResult> => {
  const fileContent = fs.readFileSync(metadataFile);

  const contentStr = fileContent.toString('utf-8').trim();
  const metadataInput = isHex(contentStr) ? (contentStr as HexString) : fileContent;

  const { metadata, runtimeVersion } = decodeMetadata(metadataInput);

  return {
    metadata,
    runtimeVersion,
    rpcMethods: [],
  };
};

export const parseMetadataFromWasm = async (runtimeFile: string): Promise<ParsedResult> => {
  const u8aMetadata = hexToU8a(
    getMetadataFromWasmRuntime(('0x' + fs.readFileSync(runtimeFile).toString('hex')) as HexString),
  );

  const { metadata, runtimeVersion } = decodeMetadata(u8aMetadata);

  return {
    metadata,
    runtimeVersion,
    rpcMethods: [],
  };
};

export const parseStaticSubstrate = async (): Promise<ParsedResult> => {
  const { runtimeVersion, metadata } = decodeMetadata(unwrapOpaqueMetadata(staticSubstrate));

  return {
    metadata,
    runtimeVersion,
    rpcMethods: rpc.methods,
  };
};

export const resolveSpecVersionBlockHash = async (client: DedotClient, specVersion: number): Promise<HexString> => {
  const upperBound = client.runtimeVersion.specVersion;
  const lowerBound = (await client.rpc.state_getRuntimeVersion(await client.rpc.chain_getBlockHash(0))).specVersion;

  if (specVersion < lowerBound) {
    throw new Error(
      `Specified specVersion ${specVersion} is lower than the earliest specVersion ${lowerBound} of the chain.`,
    );
  }

  if (specVersion > upperBound) {
    throw new Error(
      `Specified specVersion ${specVersion} is higher than the latest specVersion ${upperBound} of the chain at the current block.`,
    );
  }

  let high = (await client.block.best()).number;
  let low = 0;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const midBlockHash = await client.rpc.chain_getBlockHash(mid);
    const midRuntimeVersion = await client.rpc.state_getRuntimeVersion(midBlockHash!);
    const midSpecVersion = midRuntimeVersion.specVersion;

    if (midSpecVersion === specVersion) {
      return midBlockHash!;
    } else if (midSpecVersion < specVersion) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  throw new Error(`Could not find a block with specVersion ${specVersion}.`);
};
