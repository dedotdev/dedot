export * from './shared.js';
export * from './v4.js';
export * from './v5.js';
export * from './v6.js';

/**
 * Flags used by a contract to customize exit behaviour.
 * Ref: https://github.com/paritytech/polkadot-sdk/blob/d2fd53645654d3b8e12cbf735b67b93078d70113/substrate/frame/contracts/uapi/src/flags.rs#L23-L26
 */
export type ReturnFlags = {
  bits: number;
  revert: boolean; // 0x0000_0001
};

export type GenericInkLangError = 'CouldNotReadInput' | any;
