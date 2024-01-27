import DelightfulApi from '../../DelightfulApi';
import { CodecRegistry, SignedExtensionDefLatest } from '@delightfuldot/codecs';
import { ensurePresence } from '@delightfuldot/utils';
import * as $ from '@delightfuldot/shape';

export interface ISignedExtension {
  identifier: string;
  dataCodec: $.AnyShape;
  additionalSignedCodec: $.AnyShape;

  data?: any;
  additionalSigned?: any;
  init(): Promise<void>;
  registry: CodecRegistry;
  toPayload(...additional: any[]): object;
}

export abstract class SignedExtension<Data extends any = null, AdditionalSigned extends any = null>
  implements ISignedExtension
{
  data: Data;
  additionalSigned: AdditionalSigned;

  constructor(
    public api: DelightfulApi,
    private signedExtensionDef?: SignedExtensionDefLatest,
  ) {
    this.data = null as unknown as Data;
    this.additionalSigned = null as unknown as AdditionalSigned;
  }

  async init() {
    // TODO implement this method
  }

  get identifier(): string {
    return ensurePresence(this.signedExtensionDef?.ident);
  }

  get dataCodec(): $.AnyShape {
    return ensurePresence(this.api.registry.findPortableCodec(this.signedExtensionDef!.typeId));
  }

  get additionalSignedCodec(): $.AnyShape {
    return ensurePresence(this.api.registry.findPortableCodec(this.signedExtensionDef!.additionalSigned));
  }

  get registry() {
    return this.api.registry;
  }

  toPayload(...args: any[]) {
    return {};
  }
}
