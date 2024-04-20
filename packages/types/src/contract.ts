import { Weight } from '@dedot/codecs';
import { AnyFunc, AsyncMethod, GenericSubstrateApi } from '@dedot/types';

export type ContractResult<ChainApi extends GenericSubstrateApi> = Awaited<
  ReturnType<ChainApi['call']['contractsApi']['call']>
>;

export type ChainSubmittableExtrinsic<ChainApi extends GenericSubstrateApi> = ReturnType<
  ChainApi['tx']['contracts']['call']
>;

export type ContractOptions = {
  value: bigint;
  gasLimit: Weight | undefined;
  storageDepositLimit: bigint | undefined;
};

export interface GenericContractResult<DecodedData, ContractResult> {
  data: DecodedData;
  result: ContractResult;
}

export type GenericContractQueryCall<F extends AsyncMethod = AsyncMethod> = F & {
  meta: ContractMessage;
};

export type GenericContractTxCall<F extends AnyFunc = AnyFunc> = F & {
  meta: ContractMessage;
};

export interface GenericContractQuery {
  [method: string]: GenericContractQueryCall;
}

export interface GenericContractTx {
  [method: string]: GenericContractTxCall;
}

export interface GenericContractApi {
  query: GenericContractQuery;
  tx: GenericContractTx;
}

export interface ContractMetadata {
  source: ContractSource;
  contract: ContractInformation;
  spec: ContractSpec;
  storage: ContractStorage;
  types: ContractType[];
  version: string;
}

export interface ContractSpec {
  constructors: ContractConstructor[];
  docs: string[];
  environment: ContractEnvironment;
  events: any[];
  langError: ContractTypeInfo;
  messages: ContractMessage[];
}

export interface ContractConstructor {
  args: Arg[];
  default: boolean;
  docs: string[];
  label: string;
  payable: boolean;
  returnType: ContractTypeInfo;
  selector: string;
}

export interface ContractSource {
  hash: string;
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

export interface Arg {
  label: string;
  type: ContractTypeInfo;
}

export interface ContractTypeInfo {
  displayName: string[];
  type: number;
}

export interface ContractEnvironment {
  accountId: ContractTypeInfo;
  balance: ContractTypeInfo;
  blockNumber: ContractTypeInfo;
  chainExtension: ContractTypeInfo;
  hash: ContractTypeInfo;
  maxEventTopics: number;
  timestamp: ContractTypeInfo;
}

export interface ContractMessage {
  args: Arg[];
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
  type: ContractTypeDef;
}

export interface ContractTypeDef {
  def: Def;
  path?: string[];
  params?: ParamInfo[];
}

export interface Def {
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
