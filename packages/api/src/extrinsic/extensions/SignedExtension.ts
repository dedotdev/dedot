import { SignerPayloadJSON } from '@polkadot/types/types';
import { PortableRegistry, SignedExtensionDefLatest } from '@dedot/codecs';
import * as $ from '@dedot/shape';
import { PayloadOptions } from '@dedot/types';
import { ensurePresence } from '@dedot/utils';
import { Dedot } from '../../client/index.js';

export interface ISignedExtension {
  identifier: string;
  $Data: $.AnyShape;
  $AdditionalSigned: $.AnyShape;

  data: any;
  additionalSigned: any;
  init(): Promise<void>;
  registry: PortableRegistry;
  toPayload(...additional: any[]): Partial<SignerPayloadJSON>;
}

interface SignedExtensionOptions {
  def?: SignedExtensionDefLatest;
  signerAddress?: string;
  payloadOptions?: Partial<PayloadOptions>;
}

export abstract class SignedExtension<Data extends any = {}, AdditionalSigned extends any = []>
  implements ISignedExtension
{
  data: Data;
  additionalSigned: AdditionalSigned;

  constructor(
    public api: Dedot,
    public options?: SignedExtensionOptions,
  ) {
    this.data = {} as unknown as Data;
    this.additionalSigned = [] as unknown as AdditionalSigned;
  }

  async init() {
    // TODO implement this method
  }

  get identifier(): string {
    return this.signedExtensionDef.ident;
  }

  get $Data(): $.AnyShape {
    return ensurePresence(this.registry.findCodec(this.signedExtensionDef.typeId));
  }

  get $AdditionalSigned(): $.AnyShape {
    return ensurePresence(this.registry.findCodec(this.signedExtensionDef.additionalSigned));
  }

  get registry() {
    return this.api.registry;
  }

  get signedExtensionDef() {
    return ensurePresence(this.options!.def);
  }

  get payloadOptions() {
    return this.options?.payloadOptions || {};
  }

  toPayload(...args: any[]): Partial<SignerPayloadJSON> {
    return {};
  }
}
