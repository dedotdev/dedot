import * as $ from '@delightfuldot/shape';

/**
 * Nonce of a transaction on the Polkadot-like chains.
 */
export const $Nonce = $.u32;

export type Nonce = $.Input<typeof $Nonce>;
