import { AnyShape } from '@delightfuldot/shape';
import { Metadata } from '../metadata';
import { createPortableCodec } from './createPortableCodec';
import { getType } from './customTypes';

export class CodecRegistry {
  #metadata?: Metadata;

  constructor() {}

  findCodec(name: string): AnyShape {
    return getType(name);
  }

  findPortableCodec(typeId: number) {
    if (!this.#metadata) {
      throw new Error('Metadata is not available!');
    }

    return createPortableCodec(this.#metadata, typeId);
  }

  setMetadata(metadata: Metadata) {
    this.#metadata = metadata;
  }
}
