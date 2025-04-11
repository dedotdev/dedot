export interface ContractSource {
  hash: string;
  wasm?: string;
  language: string;
  compiler: string;
  build_info: BuildInfo;
}

export interface ContractInformation {
  name: string;
  version: string;
  authors: string[];
}

export interface BuildInfo {
  build_mode: string;
  cargo_contract_version: string;
  rust_toolchain: string;
  wasm_opt_settings: WasmOptSettings;
}

export interface WasmOptSettings {
  keep_debug_symbols: boolean;
  optimization_passes: string;
}

export interface ContractMessageArg {
  label: string;
  type: ContractTypeInfo;
}

export interface ContractTypeInfo {
  displayName: string[];
  type: number;
}

export interface ContractMessage {
  args: ContractMessageArg[];
  default: boolean;
  docs: string[];
  label: string;
  payable: boolean;
  returnType: ContractTypeInfo;
  selector: string;
}

export interface ContractConstructorMessage extends ContractMessage {}

export interface ContractCallMessage extends ContractMessage {
  mutates: boolean;
}

export interface ContractType {
  id: number;
  type: {
    def: ContractTypeDef;
    path?: string[];
    params?: ParamInfo[];
  };
}

export interface ContractTypeDef {
  composite?: CompositeType;
  array?: ArrayType;
  primitive?: string;
  sequence?: SequenceType;
  variant?: VariantType;
  tuple?: number[];
  compact?: CompactType;
  bitsequence?: BitSequenceType;
}

export interface BitSequenceType {
  bit_order_type: number;
  bit_store_type: number;
}

export interface CompactType {
  type: number;
}

export interface CompositeType {
  fields?: {
    type: number;
    typeName: string;
    name?: string;
  }[];
}

export interface ArrayType {
  len: number;
  type: number;
}

export interface SequenceType {
  type: number;
}

export interface VariantType {
  variants?: {
    index: number;
    name: string;
    fields?: {
      type: number;
      typeName?: string;
      name?: string;
    }[];
  }[];
}

export interface ParamInfo {
  name: string;
  type: number;
}

export interface ContractStorage {
  root: {
    layout: {
      struct: {
        //TODO: Write interface for fields when in needed
        fields: any[];
        name: string;
      };
    };
    root_key: string;
  };
}

export interface ContractEventArg extends ContractMessageArg {
  docs: string[];
  indexed: boolean;
}
