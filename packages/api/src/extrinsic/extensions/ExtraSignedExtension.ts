import type { SignedExtensionDefLatest } from '@dedot/codecs';
import * as $ from '@dedot/shape';
import { SignerPayloadJSON, SignerPayloadRaw } from '@dedot/types';
import { ensurePresence, HexString, u8aToHex } from '@dedot/utils';
import { FallbackSignedExtension, isEmptyStructOrTuple } from './FallbackSignedExtension.js';
import { ISignedExtension, SignedExtension } from './SignedExtension.js';
import { knownSignedExtensions } from './known/index.js';

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
      } else if (this.isRequireNoExternalInputs(extDef)) {
        return new FallbackSignedExtension(
          this.client,
          {
            ...ensurePresence(this.options),
            def: extDef,
          },
          extDef.ident,
        );
      }

      // For extensions that require input but aren't implemented, throw an error
      throw new Error(`SignedExtension for ${extDef.ident} requires input but is not implemented`);
    });
  }

  /**
   * Check if the extension requires no external inputs (e.g: struct or tuple with empty types like `()` or `[]`)
   * @param extDef - The definition of the signed extension
   * @returns boolean
   */
  private isRequireNoExternalInputs(extDef: SignedExtensionDefLatest): boolean {
    return (
      isEmptyStructOrTuple(this.registry, extDef.typeId) && // prettier-end-here
      isEmptyStructOrTuple(this.registry, extDef.additionalSigned)
    );
  }

  toPayload(call: HexString = '0x'): SignerPayloadJSON {
    const signedExtensions = this.#signedExtensions!.map((se) => se.identifier);
    const { version } = this.registry.metadata.extrinsic;
    const { signerAddress } = this.options!;

    return Object.assign(
      {
        address: signerAddress,
        signedExtensions,
        version,
        method: call,
        withSignedTransaction: true, // allow signer/wallet to alter transaction by default
      },
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
