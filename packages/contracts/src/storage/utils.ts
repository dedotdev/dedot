import { AnyLayoutV5 } from '../types/index.js';

export function findStorageRootKey(layout: AnyLayoutV5, targetId: number): string | undefined {
  if (layout.root) {
    if (layout.root.ty === targetId) {
      return layout.root.root_key;
    } else {
      return findStorageRootKey(layout.root.layout, targetId);
    }
  } else if (layout.array) {
    return findStorageRootKey(layout.array.layout, targetId);
  } else if (layout.enum) {
    for (const one of Object.values(layout.enum.variants)) {
      for (const structField of one.fields) {
        const potentialKey = findStorageRootKey(structField.layout, targetId);
        if (potentialKey) return potentialKey;
      }
    }

    return undefined;
  } else if (layout.leaf) {
    if (layout.leaf.ty === targetId) {
      return layout.leaf.key;
    } else {
      return undefined;
    }
  } else if (layout.struct) {
    for (const structField of layout.struct.fields) {
      const potentialKey = findStorageRootKey(structField.layout, targetId);
      if (potentialKey) return potentialKey;
    }

    return undefined;
  }

  throw new Error(`Layout Not Supported: ${JSON.stringify(layout)}`);
}
