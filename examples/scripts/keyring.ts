import Keyring from '@polkadot/keyring';
import { cryptoWaitReady } from '@polkadot/util-crypto';

const keyring = new Keyring({ type: 'sr25519' });

export const devPairs = async () => {
  await cryptoWaitReady();
  const alice = keyring.addFromUri('//Alice');

  return {
    alice,
  };
};
