import { SolABIItem } from "./abi.js";

export * from "./abi.js"

export interface SolDevDocMethod {
  details?: string;
  params?: Record<string, string>;
  returns?: Record<string, string>;
}

export interface SolDevDoc {
  details?: string;
  kind: 'dev';
  methods: Record<string, SolDevDocMethod>;
  title?: string;
  version: number;
}

export interface SolUserDoc {
  kind: 'user';
  methods: Record<string, any>;
  version: number;
}

// Compiler Settings Types
export interface SolOptimizerDetails {
  constantOptimizer: boolean;
  cse: boolean;
  deduplicate: boolean;
  inliner: boolean;
  jumpdestRemover: boolean;
  orderLiterals: boolean;
  peephole: boolean;
  simpleCounterForLoopUncheckedIncrement: boolean;
  yul: boolean;
}

export interface SolOptimizer {
  details: SolOptimizerDetails;
  runs: number;
}

export interface SolMetadata {
  bytecodeHash: 'ipfs' | 'bzzr1' | 'none';
}

export interface SolSettings {
  compilationTarget: Record<string, string>;
  evmVersion: string;
  libraries: Record<string, Record<string, string>>;
  metadata: SolMetadata;
  optimizer: SolOptimizer;
  remappings: string[];
}

// Source Types
export interface SolSource {
  keccak256: string;
  license?: string;
  urls: string[];
}

// Compiler Types
export interface SolCompiler {
  version: string;
}

// Output Types
export interface SolOutput {
  abi: SolABIItem[];
  devdoc: SolDevDoc;
  userdoc: SolUserDoc;
}

// Main Compilation Result Type
export interface SolCompilationResult {
  compiler: SolCompiler;
  language: 'Solidity';
  output: SolOutput;
  settings: SolSettings;
  sources: Record<string, SolSource>;
  version: number;
}