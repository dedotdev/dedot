import { ExtrinsicMetadata, TypeInfo } from './codecs';

type OptionalProps<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Chain-specific information required for metadata hash calculation
 */
export interface ChainInfo {
  /** Runtime spec version */
  specVersion: number;

  /** Runtime spec name */
  specName: string;

  /** SS58 address format prefix */
  ss58Prefix: number;

  /** Token decimal places */
  decimals: number;

  /** Token symbol */
  tokenSymbol: string;
}

export type ChainInfoOptional = OptionalProps<ChainInfo, 'specVersion' | 'specName' | 'ss58Prefix'>;

/**
 * Proof for metadata verification
 */
export interface MetadataProof {
  /** Leaves included in the proof */
  leaves: Uint8Array[];

  /** Indices of the leaves in the original tree */
  leafIndices: number[];

  /** Proof hashes */
  proofs: Uint8Array[];

  /** Extrinsic metadata */
  extrinsicMetadata: ExtrinsicMetadata;

  /** Chain metadata info */
  chainInfo: ChainInfo;
}
