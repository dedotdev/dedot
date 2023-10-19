import * as Codecs from '@delightfuldot/codecs';
import { Metadata, MetadataLatest, TypeId, PortableCodecRegistry } from '@delightfuldot/codecs';
import * as $ from '@delightfuldot/shape';

export class CodecRegistry {
  #metadata?: MetadataLatest;
  #portableCodecRegistry?: PortableCodecRegistry;
  // TODO docs!
  #runtimeCodecs: Record<string, $.AnyShape>;

  constructor() {
    this.#runtimeCodecs = {};
  }

  findCodec(name: string): $.AnyShape {
    return this.#runtimeCodecs[name] || this.#findKnownCodec(name);
  }

  #findKnownCodec(typeName: string): $.AnyShape {
    // @ts-ignore
    const $codec = (Codecs[`$${typeName}`] || $[typeName]) as $.AnyShape | undefined;

    if (!$codec) {
      throw new Error(`Unsupported codec - ${typeName}`);
    }

    return $codec;
  }

  findPortableCodec(typeId: TypeId): $.AnyShape {
    // TODO add assertion
    return this.#portableCodecRegistry!.findCodec(typeId);
  }

  setMetadata(metadata: Metadata) {
    this.#metadata = metadata.latest;
    this.#portableCodecRegistry = new PortableCodecRegistry(this.#metadata.types);

    // TODO determine runtime codecs
  }
}
