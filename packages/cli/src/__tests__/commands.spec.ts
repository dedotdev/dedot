import * as path from 'path';
import { describe, expect, it } from 'vitest';
import { parseMetadataFromRaw, parseMetadataFromWasm } from '../commands/chaintypes/utils.js';

const METADATA_FILE = path.resolve(__dirname, 'raw_metadata.scale');
const RUNTIME_FILE = path.resolve(__dirname, 'runtime.wasm');

describe('chaintypes', () => {
  it('should parse raw metadata file properly', async () => {
    const result = await parseMetadataFromRaw(METADATA_FILE);
    expect(result).toBeTruthy();
    expect(result.metadata.version).toEqual('V15');
    expect(result.runtimeVersion).toBeTypeOf('object');
    expect(result.runtimeApis).toBeTypeOf('object');
    expect(result.rpcMethods).toEqual([]);
  });

  it('should throw error for not-metadata file', async () => {
    expect(parseMetadataFromRaw(RUNTIME_FILE)).rejects.toThrowError();
  });

  it('should parse runtime wasm file properly', async () => {
    const result = await parseMetadataFromWasm(RUNTIME_FILE);
    expect(result).toBeTruthy();

    expect(result).toBeTruthy();
    expect(result.metadata.version).toEqual('V15');
    expect(result.runtimeVersion).toBeTypeOf('object');
    expect(result.runtimeApis).toBeTypeOf('object');
    expect(result.rpcMethods).toEqual([]);
  });

  it('should throw error for not-wasm file', async () => {
    expect(parseMetadataFromWasm(METADATA_FILE)).rejects.toThrowError();
  });
});
