export interface SolAbiTypeDef {
  internalType?: string;
  components?: SolAbiTypeDef[];
  name: string;
  type: string;
}

export interface SolAbiInput extends SolAbiTypeDef {}

export interface SolAbiOutput extends SolAbiTypeDef {}

export interface SolAbiFunction {
  inputs: SolAbiInput[];
  name: string;
  outputs: SolAbiOutput[];
  stateMutability: 'pure' | 'view' | 'nonpayable' | 'payable';
  type: 'function';
}

export interface SolAbiConstructor {
  inputs: SolAbiInput[];
  stateMutability: 'nonpayable' | 'payable';
  type: 'constructor';
}

export interface SolAbiEvent {
  anonymous?: boolean;
  inputs: (SolAbiInput & { indexed?: boolean })[];
  name: string;
  type: 'event';
}

export interface SolAbiError {
  inputs: SolAbiInput[];
  name: string;
  type: 'error';
}

export interface SolAbiFallback {
  type: 'fallback';
  stateMutability: 'nonpayable' | 'payable';
}

export interface SolAbiReceive {
  type: 'receive';
  stateMutability: 'payable';
}

export type SolAbiItem =
  | SolAbiFunction
  | SolAbiConstructor
  | SolAbiEvent
  | SolAbiError
  | SolAbiFallback
  | SolAbiReceive;

export type SolAbi = SolAbiItem[];
