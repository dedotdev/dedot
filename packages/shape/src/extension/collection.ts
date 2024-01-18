import { ShapeMap, ShapeSet } from 'subshape';

declare module 'subshape' {
  export interface ShapeMap<K, V> {
    toJSON(): Record<string, any>;
  }

  export interface ShapeSet<T> {
    toJSON(): Record<string, any>;
  }
}

ShapeMap.prototype.toJSON = function () {
  return Object.fromEntries(this);
};

ShapeSet.prototype.toJSON = function () {
  return Array.from(this);
};
