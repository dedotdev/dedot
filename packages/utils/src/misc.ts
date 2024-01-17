import { blake2AsHex } from '@polkadot/util-crypto';

export const calculateRuntimeApiHash = (runtimeApiName: string) => {
  return blake2AsHex(runtimeApiName, 64);
};
