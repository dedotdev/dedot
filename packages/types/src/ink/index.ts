import {
  InkContractCallMessage,
  InkContractConstructorMessage,
  InkContractEventArg,
  InkContractMessage,
  InkContractMessageArg,
  InkContractTypeDef,
} from './shared.js';
import { InkContractEventV4, InkContractMetadataV4 } from './v4.js';
import { InkContractEventV5, InkContractMetadataV5 } from './v5.js';
import { InkContractMetadataV6 } from './v6.js';

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
export type GenericInkContractMetadata = InkContractMetadataV6 | InkContractMetadataV5 | InkContractMetadataV4;
export type GenericInkContractEventMeta = InkContractEventV5 | InkContractEventV4;
export type GenericInkContractEventArg = InkContractEventArg;
export type GenericInkContractCallMessage = InkContractCallMessage;
export type GenericInkContractConstructorMessage = InkContractConstructorMessage;
export type GenericInkContractMessage = InkContractMessage;
export type GenericInkContractMessageArg = InkContractMessageArg;
export type GenericInkContractTypeDef = InkContractTypeDef;
