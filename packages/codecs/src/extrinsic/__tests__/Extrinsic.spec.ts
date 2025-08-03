import { AccountId32, Extrinsic } from '@dedot/codecs';
import * as $ from '@dedot/shape';
import { u8aToHex } from '@dedot/utils';
import { beforeEach, describe, expect, it } from 'vitest';
import { westendMetadataV16 } from '../../metadata/__tests__/shared.js';
import { $Metadata } from '../../metadata/index.js';
import { PortableRegistry } from '../../registry/PortableRegistry.js';
import { ExtrinsicType } from '../ExtrinsicVersion.js';
import { PreambleV5General, PreambleV4Bare, PreambleV4Signed, PreambleV5Bare } from '../GenericExtrinsic.js';
import staticSubstrateV14 from './kusama-hex.js';

describe('Extrinsic', () => {
  describe('V4 Extrinsics (Substrate V14)', () => {
    let $Extrinsic: $.Shape<Extrinsic>;
    let registry: PortableRegistry;

    // Ref: https://github.com/polkadot-js/api/blob/3bdf49b0428a62f16b3222b9a31bfefa43c1ca55/packages/types/src/extrinsic/Extrinsic.spec.ts#L20-L49
    const v4SignedTx =
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

    // V4 bare extrinsic (no signature, just version + call)
    const v4BareTx =
      '0x' +
      'ac' + // length (compact encoded 43 bytes)
      '04' + // V4, bare (no signing bit)
      '0400' + // balances.transferAllowDeath
      '00' + // MultiAddress, AccountId of recipient follows
      '495e1e506f266418af07fa0c5c108dd436f2faa59fe7d9e54403779f5bbd7718' + // recipient
      '0bc01eb1fc185f'; // value, 104.560 KSM

    beforeEach(() => {
      const metadata = $Metadata.tryDecode(staticSubstrateV14);
      registry = new PortableRegistry(metadata.latest);
      $Extrinsic = registry.$Extrinsic;
    });

    describe('signed extrinsics', () => {
      it('should decode V4 signed extrinsic', () => {
        const ex = $Extrinsic.tryDecode(v4SignedTx);

        expect(ex.version).toEqual(4);
        expect(ex.signed).toEqual(true);
        expect(ex.type).toEqual(ExtrinsicType.Signed);
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

      it('should encode V4 signed extrinsic', () => {
        const rawTx = u8aToHex(
          $Extrinsic.tryEncode(
            new Extrinsic(
              registry,
              {
                pallet: 'Balances',
                palletCall: {
                  name: 'TransferAllowDeath',
                  params: {
                    dest: new AccountId32(
                      '0x495e1e506f266418af07fa0c5c108dd436f2faa59fe7d9e54403779f5bbd7718',
                    ).address(),
                    value: 104560923320000n,
                  },
                },
              },
              {
                address: new AccountId32(
                  '0xfcc4910cb536b4333db4bccb40e2cf6427b4766518e754b91e70c97e4a87dbb3',
                ).address(),
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

        expect(rawTx).toEqual(v4SignedTx);
      });

      it('should create V4 signed extrinsic with explicit preamble', () => {
        const preamble: PreambleV4Signed = {
          version: 4,
          extrinsicType: ExtrinsicType.Signed,
          signature: {
            address: new AccountId32('0xfcc4910cb536b4333db4bccb40e2cf6427b4766518e754b91e70c97e4a87dbb3').address(),
            signature: {
              type: 'Ed25519',
              value:
                '0xd99ffe3e610ad234e1414bda5831395a6df9098bf80b01561ce89a5065ae89d5c10e1619c6c99131b0bea4fb73ef04d07c07770e2ae9df5c325c331769ccb300',
            },
            extra: [{}, {}, {}, {}, { type: 'Mortal', value: { period: 1024n, phase: 186n } }, 68, {}, 30000000000n],
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

        expect(extrinsic.version).toEqual(4);
        expect(extrinsic.type).toEqual(ExtrinsicType.Signed);
        expect(extrinsic.signed).toEqual(true);
        expect(extrinsic.signature).toBeDefined();
      });
    });

    describe('bare extrinsics', () => {
      it('should decode V4 bare extrinsic', () => {
        const ex = $Extrinsic.tryDecode(v4BareTx);

        expect(ex.version).toEqual(4);
        expect(ex.signed).toEqual(false);
        expect(ex.type).toEqual(ExtrinsicType.Bare);
        expect(ex.signature).toBeUndefined();

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

      it('should encode V4 bare extrinsic', () => {
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

        const rawTx = u8aToHex($Extrinsic.tryEncode(extrinsic));
        expect(rawTx).toEqual(v4BareTx);
      });

      it('should create V4 bare extrinsic with explicit preamble', () => {
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
        expect(extrinsic.type).toEqual(ExtrinsicType.Bare);
        expect(extrinsic.signed).toEqual(false);
        expect(extrinsic.signature).toBeUndefined();
      });
    });
  });

  describe('V5 Extrinsics (Westend V16)', () => {
    let $Extrinsic: $.Shape<Extrinsic>;
    let registry: PortableRegistry;

    // V5 bare extrinsic (no extensions, just version + call)
    const v5BareTx =
      '0x' +
      'ac' + // length (compact encoded 43 bytes)
      '05' + // V5, bare (0b0000_0101)
      '0a00' + // balances.transferAllowDeath (pallet 10, call 0)
      '00' + // MultiAddress, AccountId of recipient follows
      '495e1e506f266418af07fa0c5c108dd436f2faa59fe7d9e54403779f5bbd7718' + // recipient
      '0bc01eb1fc185f'; // value, 104.560 KSM

    // V5 general extrinsic would require proper extension structure
    // For now we test with simplified version without raw hex data

    beforeEach(() => {
      const metadata = $Metadata.tryDecode(westendMetadataV16);
      registry = new PortableRegistry(metadata.latest);
      $Extrinsic = registry.$Extrinsic;
    });

    describe('bare extrinsics', () => {
      it('should decode V5 bare extrinsic', () => {
        const ex = $Extrinsic.tryDecode(v5BareTx);

        expect(ex.version).toEqual(5);
        expect(ex.signed).toEqual(false);
        expect(ex.type).toEqual(ExtrinsicType.Bare);
        expect(ex.signature).toBeUndefined();
        expect(ex.extensions).toBeUndefined();

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

      it('should encode V5 bare extrinsic', () => {
        const preamble: PreambleV5Bare = {
          version: 5,
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

        const rawTx = u8aToHex($Extrinsic.tryEncode(extrinsic));
        expect(rawTx).toEqual(v5BareTx);
      });

      it('should create V5 bare extrinsic with explicit preamble', () => {
        const preamble: PreambleV5Bare = {
          version: 5,
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

        expect(extrinsic.version).toEqual(5);
        expect(extrinsic.type).toEqual(ExtrinsicType.Bare);
        expect(extrinsic.signed).toEqual(false);
        expect(extrinsic.signature).toBeUndefined();
        expect(extrinsic.extensions).toBeUndefined();
      });
    });

    describe('general extrinsics', () => {
      it('should create V5 general extrinsic with explicit preamble', () => {
        const preamble: PreambleV5General = {
          version: 5,
          extrinsicType: ExtrinsicType.General,
          versionedExtensions: {
            extensionVersion: 0,
            extra: [], // Simplified - empty extensions for now
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
        expect(extrinsic.type).toEqual(ExtrinsicType.General);
        expect(extrinsic.signed).toEqual(false);
        expect(extrinsic.signature).toBeUndefined();
        expect(extrinsic.extensions).toBeDefined();
        expect(extrinsic.extensions?.extensionVersion).toEqual(0);
      });
    });
  });

  describe('Cross-Version Error Handling', () => {
    it('should throw for V4 with General type', () => {
      expect(() => {
        new Extrinsic({} as any, {}, {
          version: 4,
          extrinsicType: ExtrinsicType.General,
        } as any);
      }).toThrow('Version 4 does not support General extrinsic type');
    });

    it('should throw for V5 with Signed type', () => {
      expect(() => {
        new Extrinsic({} as any, {}, {
          version: 5,
          extrinsicType: ExtrinsicType.Signed,
        } as any);
      }).toThrow('Version 5 does not support Signed extrinsic type');
    });
  });
});
