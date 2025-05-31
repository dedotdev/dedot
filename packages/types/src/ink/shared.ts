export interface InkContractSource {
  hash: string;
  wasm?: string;
  language: string;
  compiler: string;
  build_info: InkBuildInfo;
}

export interface InkContractInformation {
  name: string;
  version: string;
  authors: string[];
}

export interface InkBuildInfo {
  build_mode: string;
  cargo_contract_version: string;
  rust_toolchain: string;
  wasm_opt_settings: InkWasmOptSettings;
}

export interface InkWasmOptSettings {
  keep_debug_symbols: boolean;
  optimization_passes: string;
}

export interface InkContractMessageArg {
  label: string;
  type: InkContractTypeInfo;
}

export interface InkContractTypeInfo {
  displayName: string[];
  type: number;
}

export interface InkContractMessage {
  args: InkContractMessageArg[];
  default: boolean;
  docs: string[];
  label: string;
  payable: boolean;
  returnType: InkContractTypeInfo;
  selector: string;
}

export interface InkContractConstructorMessage extends InkContractMessage {}

export interface InkContractCallMessage extends InkContractMessage {
  mutates: boolean;
}

export interface InkContractType {
  id: number;
  type: {
    def: InkContractTypeDef;
    path?: string[];
    params?: InkParamInfo[];
  };
}

export interface InkContractTypeDef {
  composite?: InkCompositeType;
  array?: InkArrayType;
  primitive?: string;
  sequence?: InkSequenceType;
  variant?: InkVariantType;
  tuple?: number[];
  compact?: InkCompactType;
  bitsequence?: InkBitSequenceType;
}

export interface InkBitSequenceType {
  bit_order_type: number;
  bit_store_type: number;
}

export interface InkCompactType {
  type: number;
}

export interface InkCompositeType {
  fields?: {
    type: number;
    typeName: string;
    name?: string;
  }[];
}

export interface InkArrayType {
  len: number;
  type: number;
}

export interface InkSequenceType {
  type: number;
}

export interface InkVariantType {
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

export interface InkParamInfo {
  name: string;
  type: number;
}

export interface InkContractStorage {
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

export interface InkContractEventArg extends InkContractMessageArg {
  docs: string[];
  indexed: boolean;
}
