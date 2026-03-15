import { describe, expect, it, beforeEach } from 'vitest';
import {
  CheckMortality,
  MAX_FINALITY_LAG,
  FALLBACK_MAX_HASH_COUNT,
  MORTAL_PERIOD,
  FALLBACK_PERIOD,
} from '../known/CheckMortality.js';

const GENESIS_HASH = '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3';
const BLOCK_HASH = '0xabc123def456abc123def456abc123def456abc123def456abc123def456abc1';
const FINALIZED_BLOCK_NUMBER = 100;

function createMockClient(overrides: Record<string, any> = {}) {
  return {
    genesisHash: GENESIS_HASH,
    rpcVersion: 'v2',
    block: {
      finalized: async () => ({
        hash: BLOCK_HASH,
        number: FINALIZED_BLOCK_NUMBER,
      }),
    },
    registry: {
      findCodec: () => ({
        metadata: [{ name: '$.Era' }],
        tryEncode: (value: any) => {
          // Simple mock: immortal = [0x00], mortal = [0x01, 0x02]
          if (value?.type === 'Immortal') return new Uint8Array([0x00]);
          return new Uint8Array([0x01, 0x02]);
        },
        tryDecode: (data: any) => {
          if (data instanceof Uint8Array && data[0] === 0x00) return { type: 'Immortal' };
          return { type: 'Mortal', value: { period: 64n, phase: 36n } };
        },
      }),
    },
    consts: {
      system: { blockHashCount: 4096 },
      babe: { expectedBlockTime: 6000n },
    },
    ...overrides,
  } as any;
}

function createExtensionDef() {
  return {
    ident: 'CheckMortality',
    typeId: 1,
    additionalSigned: 2,
  };
}

function createCheckMortality(client: any, payloadOptions: Record<string, any> = {}) {
  return new CheckMortality(client, {
    def: createExtensionDef(),
    signerAddress: '0x1234',
    payloadOptions,
  });
}

describe('CheckMortality', () => {
  let mockClient: any;

  beforeEach(() => {
    mockClient = createMockClient();
  });

  describe('init() with immortal mortality', () => {
    it('should set immortal era data and genesis hash as additionalSigned', async () => {
      const ext = createCheckMortality(mockClient, {
        mortality: { type: 'Immortal' },
      });

      await ext.init();

      expect(ext.data).toEqual({ type: 'Immortal' });
      expect(ext.additionalSigned).toBe(GENESIS_HASH);
    });

    it('should return blockNumber 0x00 in toPayload() for immortal', async () => {
      const ext = createCheckMortality(mockClient, {
        mortality: { type: 'Immortal' },
      });

      await ext.init();

      const payload = ext.toPayload();
      expect(payload.blockNumber).toBe('0x00');
      expect(payload.blockHash).toBe(GENESIS_HASH);
    });
  });

  describe('init() with custom mortal period', () => {
    it('should set mortal era data with custom period', async () => {
      const ext = createCheckMortality(mockClient, {
        mortality: { type: 'Mortal', period: 128 },
      });

      await ext.init();

      expect(ext.data).toEqual({ period: 128n, current: BigInt(FINALIZED_BLOCK_NUMBER) });
      expect(ext.additionalSigned).toBe(BLOCK_HASH);
    });

    it('should return signing header info in toPayload()', async () => {
      const ext = createCheckMortality(mockClient, {
        mortality: { type: 'Mortal', period: 128 },
      });

      await ext.init();

      const payload = ext.toPayload();
      expect(payload.blockHash).toBe(BLOCK_HASH);
      expect(payload.blockNumber).toBe('0x64'); // 100 in hex
    });
  });

  describe('init() with default behavior (no mortality option)', () => {
    it('should auto-compute mortal era using calculateMortalLength', async () => {
      const ext = createCheckMortality(mockClient);

      await ext.init();

      // Default calculation: min(blockHashCount, MORTAL_PERIOD / expectedBlockTime + MAX_FINALITY_LAG)
      // = min(4096, 720000 / 6000 + 5) = min(4096, 125) = 125
      const expectedPeriod = BigInt(Math.min(4096, Math.floor(MORTAL_PERIOD / 6000) + MAX_FINALITY_LAG));
      expect(ext.data).toEqual({ period: expectedPeriod, current: BigInt(FINALIZED_BLOCK_NUMBER) });
      expect(ext.additionalSigned).toBe(BLOCK_HASH);
    });

    it('should use fallback values when consts are missing', async () => {
      const clientNoConsts = createMockClient({
        consts: {},
      });

      const ext = createCheckMortality(clientNoConsts);

      await ext.init();

      // Fallback: min(FALLBACK_MAX_HASH_COUNT, MORTAL_PERIOD / FALLBACK_PERIOD + MAX_FINALITY_LAG)
      // = min(250, 720000 / 6000 + 5) = min(250, 125) = 125
      const expectedPeriod = BigInt(
        Math.min(FALLBACK_MAX_HASH_COUNT, Math.floor(MORTAL_PERIOD / FALLBACK_PERIOD) + MAX_FINALITY_LAG),
      );
      expect(ext.data).toEqual({ period: expectedPeriod, current: BigInt(FINALIZED_BLOCK_NUMBER) });
    });
  });

  describe('init() with v2 rpc', () => {
    it('should use block.finalized() for signing header', async () => {
      let finalizedCalled = false;
      const client = createMockClient({
        rpcVersion: 'v2',
        block: {
          finalized: async () => {
            finalizedCalled = true;
            return { hash: BLOCK_HASH, number: FINALIZED_BLOCK_NUMBER };
          },
        },
      });

      const ext = createCheckMortality(client);
      await ext.init();

      expect(finalizedCalled).toBe(true);
      expect(ext.additionalSigned).toBe(BLOCK_HASH);
    });
  });

  describe('fromPayload()', () => {
    it('should restore state from a payload', async () => {
      const ext = createCheckMortality(mockClient);

      await ext.fromPayload({
        era: '0x0000',
        blockHash: BLOCK_HASH,
        blockNumber: '0x64',
        // Other required fields from SignerPayloadJSON with dummy values
        address: '0x1234',
        genesisHash: GENESIS_HASH,
        method: '0x00',
        nonce: '0x00',
        specVersion: '0x01',
        tip: '0x00',
        transactionVersion: '0x01',
        signedExtensions: [],
        version: 4,
      });

      expect(ext.additionalSigned).toBe(BLOCK_HASH);

      const payload = ext.toPayload();
      expect(payload.blockHash).toBe(BLOCK_HASH);
      expect(payload.blockNumber).toBe('0x64');
    });

    it('should round-trip from init() to toPayload() to fromPayload()', async () => {
      const ext1 = createCheckMortality(mockClient, {
        mortality: { type: 'Mortal', period: 128 },
      });
      await ext1.init();

      const payload = ext1.toPayload();

      const ext2 = createCheckMortality(mockClient);
      await ext2.fromPayload({
        era: payload.era!,
        blockHash: payload.blockHash!,
        blockNumber: payload.blockNumber!,
        address: '0x1234',
        genesisHash: GENESIS_HASH,
        method: '0x00',
        nonce: '0x00',
        specVersion: '0x01',
        tip: '0x00',
        transactionVersion: '0x01',
        signedExtensions: [],
        version: 4,
      });

      expect(ext2.additionalSigned).toBe(ext1.additionalSigned);

      const payload2 = ext2.toPayload();
      expect(payload2.blockHash).toBe(payload.blockHash);
      expect(payload2.blockNumber).toBe(payload.blockNumber);
    });
  });

  describe('toPayload()', () => {
    it('should include era, blockHash, and blockNumber', async () => {
      const ext = createCheckMortality(mockClient, {
        mortality: { type: 'Mortal', period: 64 },
      });
      await ext.init();

      const payload = ext.toPayload();
      expect(payload).toHaveProperty('era');
      expect(payload).toHaveProperty('blockHash');
      expect(payload).toHaveProperty('blockNumber');
    });
  });
});
