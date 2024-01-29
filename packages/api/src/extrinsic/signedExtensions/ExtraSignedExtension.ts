import { ISignedExtension, SignedExtension } from './SignedExtension';
import DelightfulApi from 'delightfuldot/DelightfulApi';
import { ensurePresence, HexString } from '@delightfuldot/utils';
import * as $ from '@delightfuldot/shape';
import knownSignedExtensions from './known';
import { SignerPayloadJSON, SignerPayloadRaw } from '@polkadot/types/types';
import { objectSpread, u8aToHex } from '@polkadot/util';

export class ExtraSignedExtension extends SignedExtension<any[], any[]> {
  #signedExtensions?: ISignedExtension[];
  constructor(
    api: DelightfulApi,
    private signerAddress: string,
  ) {
    super(api);
  }

  async init(): Promise<void> {
    this.#signedExtensions = this.#getSignedExtensions();

    await Promise.all(this.#signedExtensions!.map((se) => se.init()));

    this.data = this.#signedExtensions!.map((se) => se.data);
    this.additionalSigned = this.#signedExtensions!.map((se) => se.additionalSigned);
  }

  get identifier(): string {
    return 'ExtraSignedExtension';
  }

  get dataCodec(): $.AnyShape {
    const { extraTypeId } = this.api.metadataLatest.extrinsic;

    return ensurePresence(this.registry.findPortableCodec(extraTypeId));
  }

  get additionalSignedCodec(): $.AnyShape {
    const $AdditionalSignedCodecs = this.#signedExtensionDefs.map((se) =>
      this.registry.findPortableCodec(se.additionalSigned),
    );

    return $.Tuple(...$AdditionalSignedCodecs);
  }

  get payloadCodec(): $.AnyShape {
    const { callTypeId } = this.api.metadataLatest.extrinsic;
    const $Call = this.registry.findPortableCodec(callTypeId);

    return $.Tuple($Call, this.dataCodec, this.additionalSignedCodec);
  }

  get #signedExtensionDefs() {
    return this.api.metadataLatest.extrinsic.signedExtensions;
  }

  #getSignedExtensions() {
    return this.#signedExtensionDefs.map(
      (extDef) =>
        new knownSignedExtensions[extDef.ident as keyof typeof knownSignedExtensions](
          this.api,
          extDef,
          this.signerAddress,
        ),
    );
  }

  toPayload(call: HexString = '0x'): SignerPayloadJSON {
    const signedExtensions = this.#signedExtensions!.map((se) => se.identifier);
    const { version } = this.api.registry.metadata!.extrinsic;

    return objectSpread(
      { address: this.signerAddress, signedExtensions, version, method: call },
      ...this.#signedExtensions!.map((se) => se.toPayload()),
    ) as SignerPayloadJSON;
  }

  toRawPayload(call: HexString = '0x'): SignerPayloadRaw {
    const payload = this.toPayload(call);
    const $ToSignPayload = $.Tuple($.RawHex, this.dataCodec, this.additionalSignedCodec);
    const toSignPayload = [call, this.data, this.additionalSigned];
    const rawPayload = $ToSignPayload.tryEncode(toSignPayload);

    return {
      address: payload.address,
      data: u8aToHex(rawPayload),
      type: 'payload',
    };
  }
}
