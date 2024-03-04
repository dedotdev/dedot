import { beforeEach, describe, expect, it } from 'vitest';
import { $Metadata } from '../../metadata';
import { CodecRegistry } from '../../../registry';
import staticSubstrateV14 from '@polkadot/types-support/metadata/v14/kusama-hex';
import { AccountId32, Extrinsic } from '@dedot/codecs';
import * as $ from '@dedot/shape';
import { u8aToHex } from '@polkadot/util';

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
  let $Extrinsic: $.Shape<Extrinsic>, registry: CodecRegistry;
  beforeEach(() => {
    const metadata = $Metadata.tryDecode(staticSubstrateV14);
    registry = new CodecRegistry(metadata.latest);

    $Extrinsic = registry.$Extrinsic;
  });

  it('should decode sample extrinsic', () => {
    const ex = $Extrinsic.tryDecode(sampleTx);

    expect(ex.version).toEqual(4);
    expect(ex.signed).toEqual(true);
    expect(ex.signature?.address.tag).toEqual('Id');
    expect(ex.signature?.address.value.raw).toEqual(
      '0xfcc4910cb536b4333db4bccb40e2cf6427b4766518e754b91e70c97e4a87dbb3',
    );
    expect(ex.signature?.signature.tag).toEqual('Ed25519');
    expect(ex.signature?.signature.value).toEqual(
      '0xd99ffe3e610ad234e1414bda5831395a6df9098bf80b01561ce89a5065ae89d5c10e1619c6c99131b0bea4fb73ef04d07c07770e2ae9df5c325c331769ccb300',
    );
    expect(ex.signature?.extra).toEqual([
      {},
      {},
      {},
      {},
      { tag: 'Mortal', value: { period: 1024n, phase: 186n } }, // mortality
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
            tag: 'Id',
            value: new AccountId32('0x495e1e506f266418af07fa0c5c108dd436f2faa59fe7d9e54403779f5bbd7718'),
          },
          value: 104560923320000n,
        },
      },
    });
  });

  it('should encode sample transaction', () => {
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
              tag: 'Ed25519',
              value:
                '0xd99ffe3e610ad234e1414bda5831395a6df9098bf80b01561ce89a5065ae89d5c10e1619c6c99131b0bea4fb73ef04d07c07770e2ae9df5c325c331769ccb300',
            },
            extra: [
              {},
              {},
              {},
              {},
              { tag: 'Mortal', value: { period: 1024n, phase: 186n } }, // mortality
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
});
