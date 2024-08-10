import * as path from 'path';
import { describe, expect, it } from 'vitest';
import { parseMetadataFromRaw, parseMetadataFromWasm } from '../commands/chaintypes/utils.js';

const METADATA_FILE = path.resolve(__dirname, 'raw_metadata.scale');
const RUNTIME_FILE = path.resolve(__dirname, 'runtime.wasm');

describe('chaintypes', () => {
  it('should parse raw metadata file properly', async () => {
    expect(await parseMetadataFromRaw(METADATA_FILE)).toBeTruthy();
  });
  it('should parse runtime wasm file properly', async () => {
    expect(await parseMetadataFromWasm(RUNTIME_FILE)).toBeTruthy();
  });
});

