import * as $ from '@delightfuldot/shape';
import { findPredefinedCodec } from '../codec';
import { Metadata, MetadataLatest, TypeId, PortableCodecRegistry } from '../metadata';

export class CodecRegistry {
  #metadata?: MetadataLatest;
  #portableCodecRegistry?: PortableCodecRegistry;

  constructor() {}

  findCodec(name: string): $.AnyShape {
    return findPredefinedCodec(name);
  }

  findPortableCodec(typeId: TypeId): $.AnyShape {
    // TODO add assertion
    return this.#portableCodecRegistry!.findCodec(typeId);
  }

  setMetadata(metadata: Metadata) {
    this.#metadata = metadata.latest;
    this.#portableCodecRegistry = new PortableCodecRegistry(this.#metadata.types);
  }
}
