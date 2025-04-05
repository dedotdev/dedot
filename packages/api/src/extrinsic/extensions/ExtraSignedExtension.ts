import * as $ from '@dedot/shape';
import { SignerPayloadJSON, SignerPayloadRaw } from '@dedot/types';
import { assert, ensurePresence, HexString, u8aToHex } from '@dedot/utils';
import { ISignedExtension, SignedExtension } from './SignedExtension.js';
import { NoopSignedExtension } from './NoopSignedExtension.js';
import { knownSignedExtensions } from './known/index.js';
import { isEmptyOrTrivialType } from './utils.js';

export class ExtraSignedExtension extends SignedExtension<any[], any[]> {
  #signedExtensions?: ISignedExtension[];

  async init(): Promise<void> {
    this.#signedExtensions = this.#getSignedExtensions();

    await Promise.all(this.#signedExtensions!.map((se) => se.init()));

    this.data = this.#signedExtensions!.map((se) => se.data);
    this.additionalSigned = this.#signedExtensions!.map((se) => se.additionalSigned);
  }

  get identifier(): string {
    return 'ExtraSignedExtension';
  }

  get $Data(): $.AnyShape {
    const { extraTypeId } = this.registry.metadata.extrinsic;

    return ensurePresence(this.registry.findCodec(extraTypeId));
  }

  get $AdditionalSigned(): $.AnyShape {
    const $AdditionalSignedCodecs = this.#signedExtensionDefs.map((se) => this.registry.findCodec(se.additionalSigned));

    return $.Tuple(...$AdditionalSignedCodecs);
  }

  get $Payload(): $.AnyShape {
    const { callTypeId } = this.registry.metadata.extrinsic;
    const $Call = this.registry.findCodec(callTypeId);

    return $.Tuple($Call, this.$Data, this.$AdditionalSigned);
  }

  get #signedExtensionDefs() {
    return this.registry.metadata.extrinsic.signedExtensions;
  }

  #getSignedExtensions() {
    return this.#signedExtensionDefs.map((extDef) => {
      const { signedExtensions: userSignedExtensions = {} } = this.client.options;

      const Extension =
        userSignedExtensions[extDef.ident as keyof typeof knownSignedExtensions] ||
        knownSignedExtensions[extDef.ident as keyof typeof knownSignedExtensions];

      if (Extension) {
        return new Extension(this.client, {
          ...ensurePresence(this.options),
          def: extDef,
        });
      } else {
        // Check if the extension requires no external inputs (has empty/trivial types)
        const requireNoExternalInputs = (
          isEmptyOrTrivialType(this.registry, extDef.typeId) &&
          isEmptyOrTrivialType(this.registry, extDef.additionalSigned)
        );

        if (requireNoExternalInputs) {
          // Use NoopSignedExtension for extensions that don't require input
          console.warn(`SignedExtension for ${extDef.ident} not found, using NoopSignedExtension`);
          return new NoopSignedExtension(
            this.client,
            {
              ...ensurePresence(this.options),
              def: extDef,
            },
            extDef.ident
          );
        }

        // For extensions that require input but aren't implemented, throw an error
        throw new Error(`SignedExtension for ${extDef.ident} requires input but is not implemented`);
      }
    });
  }

  toPayload(call: HexString = '0x'): SignerPayloadJSON {
    const signedExtensions = this.#signedExtensions!.map((se) => se.identifier);
    const { version } = this.registry.metadata.extrinsic;

    return Object.assign(
      { address: this.options!.signerAddress, signedExtensions, version, method: call },
      ...this.#signedExtensions!.map((se) => se.toPayload()),
    ) as SignerPayloadJSON;
  }

  toRawPayload(call: HexString = '0x'): SignerPayloadRaw {
    const payload = this.toPayload(call);
    const $ToSignPayload = $.Tuple($.RawHex, this.$Data, this.$AdditionalSigned);
    const toSignPayload = [call, this.data, this.additionalSigned];
    const rawPayload = $ToSignPayload.tryEncode(toSignPayload);

    return {
      address: payload.address,
      data: u8aToHex(rawPayload),
      type: 'payload',
    };
  }
}
