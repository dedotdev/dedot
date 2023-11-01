// Since types & interfaces are all erased at compile-time and not exist at runtime
// We register the type into registry
class TypeRegistry {
  types: Set<string>;

  constructor() {
    this.types = new Set<string>();
  }

  add(type: string) {
    this.types.add(type);
  }

  has(type: string) {
    return this.types.has(type);
  }
}

export const registry = new TypeRegistry();
