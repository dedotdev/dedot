import { HexString } from '@dedot/utils';

export type KeypairType = 'ed25519' | 'sr25519' | 'ecdsa' | 'ethereum';

export interface InjectedAccount {
  address: string;
  genesisHash?: string | null;
  name?: string;
  type?: KeypairType;
}

export interface InjectedAccounts {
  get: (anyType?: boolean) => Promise<InjectedAccount[]>;
  subscribe: (cb: (accounts: InjectedAccount[]) => void | Promise<void>) => () => void;
}

export interface InjectedExtensionInfo {
  name: string;
  version: string;
}

export interface Injected {
  accounts: InjectedAccounts;
  signer: InjectedSigner;
}

export interface InjectedWindowProvider {
  connect?: (origin: string) => Promise<InjectedExtension>;
  enable?: (origin: string) => Promise<Injected>;
  version?: string;
}

type This = typeof globalThis;
export interface InjectedWindow extends This {
  injectedWeb3: Record<string, InjectedWindowProvider>;
}

export interface IKeyringPair {
  readonly address: string;
  readonly addressRaw: Uint8Array;
  readonly publicKey: Uint8Array;
  sign: (
    data: Uint8Array,
    options?: {
      /** Create a MultiSignature-compatible output with an indicator type */
      withType?: boolean;
    },
  ) => Uint8Array;
}

export type InjectedExtension = InjectedExtensionInfo & Injected;

export interface SignerResult {
  id: number;
  signature: HexString;
  signedTransaction?: HexString | Uint8Array;
}

export interface InjectedSigner {
  signPayload?: (payload: SignerPayloadJSON) => Promise<SignerResult>;
  signRaw?: (raw: SignerPayloadRaw) => Promise<SignerResult>;
}

export interface SignerPayloadJSON {
  address: string;
  assetId?: HexString;
  blockHash: HexString;
  blockNumber: HexString;
  era: HexString;
  genesisHash: HexString;
  metadataHash?: HexString;
  method: string;
  mode?: number;
  nonce: HexString;
  specVersion: HexString;
  tip: HexString;
  transactionVersion: HexString;
  signedExtensions: string[];
  version: number;
  withSignedTransaction?: boolean;
}

export interface SignerPayloadRaw {
  data: string;
  address: string;
  type: 'bytes' | 'payload';
}
