export interface SolABITypeDef {
  internalType?: string;
  components?: SolABITypeDef[];
  name: string;
  type: string;
}

export interface SolABIInput extends SolABITypeDef {}

export interface SolABIOutput extends SolABITypeDef {}

export interface SolAbiFunction {
  inputs: SolABIInput[];
  name: string;
  outputs: SolABIOutput[];
  stateMutability: 'pure' | 'view' | 'nonpayable' | 'payable';
  type: 'function';
}

export interface SolAbiConstructor {
  inputs: SolABIInput[];
  stateMutability: 'nonpayable' | 'payable';
  type: 'constructor';
}

export interface SolAbiEvent {
  anonymous?: boolean;
  inputs: (SolABIInput & { indexed?: boolean })[];
  name: string;
  type: 'event';
}

export interface SolAbiError {
  inputs: SolABIInput[];
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
