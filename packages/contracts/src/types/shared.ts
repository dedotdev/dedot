export interface ContractSource {
  hash: string;
  wasm?: string;
  language: string;
  compiler: string;
  buildInfo: BuildInfo;
}

export interface ContractInformation {
  name: string;
  version: string;
  authors: string[];
}

export interface BuildInfo {
  buildMode: string;
  cargoContractVersion: string;
  rustToolchain: string;
  wasmOptSettings: WasmOptSettings;
}

export interface WasmOptSettings {
  keepDebugSymbols: boolean;
  optimizationPasses: string;
}

export interface ContractMessageArg {
  label: string;
  type: ContractTypeInfo;
}

export interface ContractTypeInfo {
  displayName: string[];
  type: number;
}

export interface ContractConstructorMessage {
  args: ContractMessageArg[];
  default: boolean;
  docs: string[];
  label: string;
  payable: boolean;
  returnType: ContractTypeInfo;
  selector: string;
}

export interface ContractMessage {
  args: ContractMessageArg[];
  default: boolean;
  docs: string[];
  label: string;
  mutates: boolean;
  payable: boolean;
  returnType: ContractTypeInfo;
  selector: string;
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
}

export interface CompositeType {
  fields: {
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