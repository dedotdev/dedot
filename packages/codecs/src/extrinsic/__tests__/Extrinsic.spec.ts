import { AccountId32, Extrinsic } from '@dedot/codecs';
import * as $ from '@dedot/shape';
import { u8aToHex } from '@dedot/utils';
import { beforeEach, describe, expect, it } from 'vitest';
import { $Metadata } from '../../metadata/index.js';
import { PortableRegistry } from '../../registry/PortableRegistry.js';
import { PreambleV5General, PreambleV4Bare } from '../GenericExtrinsic.js';
import { ExtrinsicType } from '../ExtrinsicVersion.js';
import staticSubstrateV14 from './kusama-hex.js';

// Ref: https://github.com/polkadot-js/api/blob/3bdf49b0428a62f16b3222b9a31bfefa43c1ca55/packages/types/src/extrinsic/Extrinsic.spec.ts#L20-L49
const sampleTx =
  '0x' +
  '5d02' + // length
  '84' + // V4, signing bit set
  '00' + // MultiAddress, AccountId of sender follows
  'fcc4910cb536b4333db4bccb40e2cf6427b4766518e754b91e70c97e4a87dbb3' + // sender
  '00' + // multisig, type ed25519
  'd99ffe3e610ad234e1414bda5831395a6df9098bf80b01561ce89a5065ae89d5' + // sig first 32
  'c10e1619c6c99131b0bea4fb73ef04d07c07770e2ae9df5c325c331769ccb300' + // sig last 32
  'a90b' + // mortal era
  '1101' + // nonce, compact 68
  '0700ac23fc06' + // tip, 0.03 KSM
  '0400' + // balances.transferAllowDeath (on Kusama this was 0400, changed here to match metadata)
  '00' + // MultiAddress, AccountId of recipient follows
  '495e1e506f266418af07fa0c5c108dd436f2faa59fe7d9e54403779f5bbd7718' + // recipient
  '0bc01eb1fc185f'; // value, 104.560 KSM

describe('Extrinsic', () => {
  let $Extrinsic: $.Shape<Extrinsic>, registry: PortableRegistry;
  beforeEach(() => {
    const metadata = $Metadata.tryDecode(staticSubstrateV14);
    registry = new PortableRegistry(metadata.latest);

    $Extrinsic = registry.$Extrinsic;
  });

  it('should decode sample extrinsic', () => {
    const ex = $Extrinsic.tryDecode(sampleTx);

    expect(ex.version).toEqual(4);
    expect(ex.signed).toEqual(true);
    expect(ex.signature?.address.type).toEqual('Id');
    expect(ex.signature?.address.value.raw).toEqual(
      '0xfcc4910cb536b4333db4bccb40e2cf6427b4766518e754b91e70c97e4a87dbb3',
    );
    expect(ex.signature?.signature.type).toEqual('Ed25519');
    expect(ex.signature?.signature.value).toEqual(
      '0xd99ffe3e610ad234e1414bda5831395a6df9098bf80b01561ce89a5065ae89d5c10e1619c6c99131b0bea4fb73ef04d07c07770e2ae9df5c325c331769ccb300',
    );
    expect(ex.signature?.extra).toEqual([
      {},
      {},
      {},
      {},
      { type: 'Mortal', value: { period: 1024n, phase: 186n } }, // mortality
      68, // nonce
      {},
      30000000000n, // tip
    ]);

    expect(ex.call).toEqual({
      pallet: 'Balances',
      palletCall: {
        name: 'TransferAllowDeath',
        params: {
          dest: {
            type: 'Id',
            value: new AccountId32('0x495e1e506f266418af07fa0c5c108dd436f2faa59fe7d9e54403779f5bbd7718'),
          },
          value: 104560923320000n,
        },
      },
    });
  });

  it.skip('should encode sample transaction', () => {
    const rawTx = u8aToHex(
      $Extrinsic.tryEncode(
        new Extrinsic(
          registry,
          {
            pallet: 'Balances',
            palletCall: {
              name: 'TransferAllowDeath',
              params: {
                dest: new AccountId32('0x495e1e506f266418af07fa0c5c108dd436f2faa59fe7d9e54403779f5bbd7718').address(),
                value: 104560923320000n,
              },
            },
          },
          {
            address: new AccountId32('0xfcc4910cb536b4333db4bccb40e2cf6427b4766518e754b91e70c97e4a87dbb3').address(),
            signature: {
              type: 'Ed25519',
              value:
                '0xd99ffe3e610ad234e1414bda5831395a6df9098bf80b01561ce89a5065ae89d5c10e1619c6c99131b0bea4fb73ef04d07c07770e2ae9df5c325c331769ccb300',
            },
            extra: [
              {},
              {},
              {},
              {},
              { type: 'Mortal', value: { period: 1024n, phase: 186n } }, // mortality
              68, // nonce
              {},
              30000000000n, // tip
            ],
          },
        ),
      ),
    );

    expect(rawTx).toEqual(sampleTx);
  });

  it('should create v5 extrinsic with explicit preamble control', () => {
    const preamble: PreambleV5General = {
      version: 5,
      extrinsicType: ExtrinsicType.General,
      versionedExtensions: {
        extensionVersion: 0,
        extra: [
          {},
          {},
          {},
          {},
          { type: 'Mortal', value: { period: 1024n, phase: 186n } },
          68,
          {},
          30000000000n,
        ],
      },
    };

    const extrinsic = new Extrinsic(
      registry,
      {
        pallet: 'Balances',
        palletCall: {
          name: 'TransferAllowDeath',
          params: {
            dest: new AccountId32('0x495e1e506f266418af07fa0c5c108dd436f2faa59fe7d9e54403779f5bbd7718').address(),
            value: 104560923320000n,
          },
        },
      },
      preamble,
    );

    expect(extrinsic.version).toEqual(5);
    expect(extrinsic.extrinsicType).toEqual(ExtrinsicType.General);
    expect(extrinsic.signed).toEqual(false);
    expect(extrinsic.versionedExtensions).toBeDefined();
    expect(extrinsic.versionedExtensions?.extensionVersion).toEqual(0);
  });

  it('should create v4 bare extrinsic with explicit control', () => {
    const preamble: PreambleV4Bare = {
      version: 4,
      extrinsicType: ExtrinsicType.Bare,
    };

    const extrinsic = new Extrinsic(
      registry,
      {
        pallet: 'Balances',
        palletCall: {
          name: 'TransferAllowDeath',
          params: {
            dest: new AccountId32('0x495e1e506f266418af07fa0c5c108dd436f2faa59fe7d9e54403779f5bbd7718').address(),
            value: 104560923320000n,
          },
        },
      },
      preamble,
    );

    expect(extrinsic.version).toEqual(4);
    expect(extrinsic.extrinsicType).toEqual(ExtrinsicType.Bare);
    expect(extrinsic.signed).toEqual(false);
    expect(extrinsic.signature).toBeUndefined();
  });

  // TypeScript should prevent invalid combinations (these would be compile-time errors):
  /* 
  it('should prevent invalid combinations at compile time', () => {
    // ❌ V4 with General type - TypeScript error
    const invalid1: PreambleV4General = {
      version: 4,
      extrinsicType: ExtrinsicType.General,  // Error: General not allowed in V4
      versionedExtensions: { extensionVersion: 1, extra: [] }
    };

    // ❌ V5 with Signed type - TypeScript error  
    const invalid2: PreambleV5Signed = {
      version: 5,
      extrinsicType: ExtrinsicType.Signed,  // Error: Signed not allowed in V5
      signature: { address, signature, extra }
    };

    // ❌ V4 with versionedExtensions - TypeScript error
    const invalid3: PreambleV4Bare = {
      version: 4,
      extrinsicType: ExtrinsicType.Bare,
      versionedExtensions: { extensionVersion: 1, extra: [] }  // Error: Property doesn't exist
    };
  });
  */
});
