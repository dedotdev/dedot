import { PortableRegistry } from '@dedot/codecs';
import { SignerPayloadJSON } from '@dedot/types';
import { describe, expect, it } from 'vitest';
import { ISubstrateClient } from '../../../types.js';
import { ExtraSignedExtension } from '../ExtraSignedExtension.js';
import { SignedExtension } from '../SignedExtension.js';

const makeExtension = (indexes = [1, 0]) => {
  const types = [
    { type: 'Tuple', value: { fields: [] } },
    { type: 'Primitive', value: { kind: 'u8' } },
    { type: 'Primitive', value: { kind: 'u32' } },
  ].map((typeDef, id) => ({ id, path: [], params: [], docs: [], typeDef }));
  const registry = new PortableRegistry({
    types,
    extrinsic: {
      versions: [4, 5],
      signedExtensionsByVersion: new Map([
        [0, indexes],
        [1, [2, 0, 1]],
      ]),
      signedExtensions: [
        { ident: 'First', typeId: 1, additionalSigned: 1 },
        { ident: 'Second', typeId: 2, additionalSigned: 2 },
        // Asset Hub V16 metadata includes this only in another extension set.
        { ident: 'VerifyMultiSignature', typeId: 1, additionalSigned: 0 },
      ],
    },
  } as any);

  class First extends SignedExtension<number, number> {
    async init() {
      this.data = 7;
      this.additionalSigned = 11;
    }
    async fromPayload() {
      await this.init();
    }
  }
  class Second extends SignedExtension<number, number> {
    async init() {
      this.data = 9;
      this.additionalSigned = 13;
    }
    async fromPayload() {
      await this.init();
    }
  }
  const client = { registry, options: { signedExtensions: { First, Second } } } as unknown as ISubstrateClient<
    any,
    any
  >;
  const extension = new ExtraSignedExtension(client, { signerAddress: 'test-account' });
  return { extension, registry };
};

describe('ExtraSignedExtension', () => {
  it.each(['init', 'fromPayload'] as const)('%s selects version-zero extensions in metadata order', async (method) => {
    const { extension } = makeExtension();
    if (method === 'init') {
      await extension.init();
    } else {
      await extension.fromPayload({} as SignerPayloadJSON);
    }

    expect(extension.toPayload().signedExtensions).toEqual(['Second', 'First']);
    expect(extension.toPayload().version).toBe(4);
    expect(extension.data).toEqual([9, 7]);
    expect(extension.additionalSigned).toEqual([13, 11]);
    expect(Array.from(extension.$Data.tryEncode(extension.data))).toEqual([9, 0, 0, 0, 7]);
    expect(Array.from(extension.$AdditionalSigned.tryEncode(extension.additionalSigned))).toEqual([13, 0, 0, 0, 11]);
  });

  it('preserves the single extension set produced by older metadata conversion', async () => {
    const { extension, registry } = makeExtension([0, 1]);
    registry.metadata.extrinsic.versions = [4];
    registry.metadata.extrinsic.signedExtensionsByVersion.delete(1);
    registry.metadata.extrinsic.signedExtensions.pop();
    await extension.init();
    expect(extension.toPayload().signedExtensions).toEqual(['First', 'Second']);
  });

  it('allows an empty version-zero extension set', async () => {
    const { extension } = makeExtension([]);
    await extension.init();
    expect(extension.toPayload().signedExtensions).toEqual([]);
    expect(Array.from(extension.$AdditionalSigned.tryEncode(extension.additionalSigned))).toEqual([]);
  });

  it('still rejects unsupported extensions in the selected set', async () => {
    const { extension } = makeExtension([2, 0, 1]);
    await expect(extension.init()).rejects.toThrow(
      'SignedExtension for VerifyMultiSignature requires input but is not implemented',
    );
  });

  it('fails closed when extension version zero is missing', async () => {
    const { extension, registry } = makeExtension();
    registry.metadata.extrinsic.signedExtensionsByVersion.delete(0);
    await expect(extension.init()).rejects.toThrow('No signed extensions found for extension version 0');
  });
});
