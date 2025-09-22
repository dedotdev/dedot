export interface SolABITypeDef {
  internalType?: string;
  components?: SolABITypeDef[];
  name: string;
  type: string;
}

export interface SolABIInput extends SolABITypeDef {}

export interface SolABIOutput extends SolABITypeDef {}

export interface SolABIFunction {
  inputs: SolABIInput[];
  name: string;
  outputs: SolABIOutput[];
  stateMutability: 'pure' | 'view' | 'nonpayable' | 'payable';
  type: 'function';
}

export interface SolABIConstructor {
  inputs: SolABIInput[];
  stateMutability: 'nonpayable' | 'payable';
  type: 'constructor';
}

export interface SolABIEvent {
  anonymous?: boolean;
  inputs: (SolABIInput & { indexed?: boolean })[];
  name: string;
  type: 'event';
}

export interface SolABIError {
  inputs: SolABIInput[];
  name: string;
  type: 'error';
}

export interface SolABIFallback {
  type: 'fallback';
  stateMutability: 'nonpayable' | 'payable';
}

export interface SolABIReceive {
  type: 'receive';
  stateMutability: 'payable';
}

export type SolABIItem =
  | SolABIFunction
  | SolABIConstructor
  | SolABIEvent
  | SolABIError
  | SolABIFallback
  | SolABIReceive;

export type SolABI = SolABIItem[];

export type SolABI = SolABIItem[];
