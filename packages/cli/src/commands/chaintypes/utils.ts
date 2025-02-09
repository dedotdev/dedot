import { rpc } from '@polkadot/types-support/metadata/static-substrate';
import staticSubstrate from '@polkadot/types-support/metadata/v15/substrate-hex';
import { ConstantExecutor } from '@dedot/api';
import { $Metadata, Metadata, PortableRegistry, RuntimeVersion, unwrapOpaqueMetadata } from '@dedot/codecs';
import * as $ from '@dedot/shape';
import { HexString, hexToU8a, u8aToHex } from '@dedot/utils';
import { getMetadataFromRuntime } from '@polkadot-api/wasm-executor';
import * as fs from 'fs';
import { DecodedMetadataInfo, ParsedResult } from './types.js';

export const getRuntimeVersion = (metadata: Metadata): RuntimeVersion => {
  const registry = new PortableRegistry(metadata.latest);
  const executor = new ConstantExecutor({
    registry,
    metadata,
  } as any);

  return executor.execute('system', 'version') as RuntimeVersion;
};

export const decodeMetadata = (metadataHex: HexString): DecodedMetadataInfo => {
  const metadata = $Metadata.tryDecode(metadataHex);
  const runtimeVersion = getRuntimeVersion(metadata);
  const apis: Record<string, number> = runtimeVersion.apis.reduce(
    (acc, [name, version]) => {
      acc[name] = version;
      return acc;
    },
    {} as Record<string, number>,
  );

  return {
    metadata,
    runtimeVersion: {
      ...runtimeVersion,
      apis,
    },
  };
};

export const parseMetadataFromRaw = async (metadataFile: string): Promise<ParsedResult> => {
  const metadataHex = fs.readFileSync(metadataFile, 'utf-8').trim() as HexString;
  const { metadata, runtimeVersion } = decodeMetadata(metadataHex);

  return {
    metadata,
    runtimeVersion,
    rpcMethods: [],
  };
};

export const parseMetadataFromWasm = async (runtimeFile: string): Promise<ParsedResult> => {
  const u8aMetadata = hexToU8a(
    getMetadataFromRuntime(('0x' + fs.readFileSync(runtimeFile).toString('hex')) as HexString),
  );
  // Because this u8aMetadata has compactInt prefixed for it length, we need to get rid of it.
  const length = $.compactU32.tryDecode(u8aMetadata);
  const offset = $.compactU32.tryEncode(length).length;

  const metadataHex = u8aToHex(u8aMetadata.subarray(offset));

  const { metadata, runtimeVersion } = decodeMetadata(metadataHex);

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
