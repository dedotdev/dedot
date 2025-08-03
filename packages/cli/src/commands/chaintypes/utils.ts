import { rpc } from '@polkadot/types-support/metadata/static-substrate';
import staticSubstrate from '@polkadot/types-support/metadata/v15/substrate-hex';
import { ConstantExecutor } from '@dedot/api';
import { $Metadata, Metadata, PortableRegistry, RuntimeVersion, unwrapOpaqueMetadata } from '@dedot/codecs';
import * as $ from '@dedot/shape';
import { HexString, hexToU8a, isHex } from '@dedot/utils';
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
    getMetadataFromRuntime(('0x' + fs.readFileSync(runtimeFile).toString('hex')) as HexString),
  );
  // Because this u8aMetadata has compactInt prefixed for it length, we need to get rid of it.
  const length = $.compactU32.tryDecode(u8aMetadata);
  const offset = $.compactU32.tryEncode(length).length;

  const metadataU8a = u8aMetadata.subarray(offset);

  const { metadata, runtimeVersion } = decodeMetadata(metadataU8a);

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
