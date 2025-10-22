import { DispatchError, PalletErrorMetadataLatest } from '@dedot/codecs';
import { assert, DedotError } from '@dedot/utils';
import {
  ContractCallResult,
  ContractInstantiateResult,
  GenericContractApi,
  InkGenericContractApi,
  ReturnFlags,
  SolAbiError,
  SolGenericContractApi,
} from './types/index.js';
import { toReturnFlags } from './utils/index.js';

const formatDispatchError = (err: DispatchError, moduleError?: PalletErrorMetadataLatest) => {
  if (moduleError) {
    const { pallet, name, docs } = moduleError;
    let message = `Dispatch error: ${pallet}::${name}`;
    if (docs) {
      message += ` - ${docs.join('\n  ')}`;
    }
    return message;
  } else {
    return `Dispatch error: ${JSON.stringify(err)}`;
  }
};

/**
 * Formats a Solidity contract error message.
 * If the error is the standard Solidity 'Error(string message)' pattern,
 * extract and return the message string directly.
 * Otherwise, return a formatted error name.
 *
 * @param details - The Solidity error result details.
 * @returns A formatted error message string.
 */
const formatSolErrorMessage = (details?: SolErrorResult): string => {
  if (!details) {
    return 'Unknown Error';
  }

  // Check if this is the standard Solidity Error(string) pattern
  const isSolidityError =
    details.errorName === 'Error' &&
    details.abiItem.inputs.length === 1 &&
    details.abiItem.inputs[0]?.name === 'message' &&
    details.abiItem.inputs[0]?.type === 'string';

  if (isSolidityError && details.args && details.args.length > 0) {
    // Extract the message from args[0]
    return String(details.args[0]);
  }

  // Default format for other errors
  return `Error: ${details.errorName}`;
};

/**
 * Represents an error that occurred during the instantiation of a smart contract.
 * This class extends the base `DedotError` and includes a `raw` property of type `ContractInstantiateResult`.
 *
 * @template ContractApi - The type of the contract API. Defaults to `GenericContractApi`.
 *
 * @extends DedotError
 */
export class ContractInstantiateError<ContractApi extends GenericContractApi = GenericContractApi> extends DedotError {
  name = 'ContractInstantiateError';
  /**
   * The raw result of the contract instantiation.
   */
  raw: ContractInstantiateResult<ContractApi['types']['ChainApi']>;

  /**
   * Constructs a new `ContractInstantiateError` instance.
   *
   * @param raw - The raw result of the contract instantiation.
   */
  constructor(raw: ContractInstantiateResult<ContractApi['types']['ChainApi']>) {
    super();
    this.raw = raw;
  }
}

/**
 * Represents an error that occurred during the dispatch phase of contract instantiation.
 * This class extends `ContractInstantiateError` and includes a `DispatchError` property.
 *
 * @template ContractApi - The type of the contract API. Defaults to `GenericContractApi`.
 *
 * @extends ContractInstantiateError
 */
export class ContractInstantiateDispatchError<
  ContractApi extends GenericContractApi = GenericContractApi,
> extends ContractInstantiateError<ContractApi> {
  name = 'ContractInstantiateDispatchError';
  /**
   * The error that occurred during the dispatch phase.
   */
  dispatchError: DispatchError;
  /**
   * The decoded module error, if any.
   */
  moduleError?: PalletErrorMetadataLatest;

  /**
   * Constructs a new `ContractInstantiateDispatchError` instance.
   *
   * @param err - The `DispatchError` that occurred during the dispatch phase.
   * @param raw - The raw result of the contract instantiation.
   * @param moduleError - The decoded module error, if any.
   */
  constructor(
    err: DispatchError,
    raw: ContractInstantiateResult<ContractApi['types']['ChainApi']>,
    moduleError?: PalletErrorMetadataLatest,
  ) {
    super(raw);
    this.dispatchError = err;
    this.moduleError = moduleError;
    this.message = formatDispatchError(err, moduleError);
  }
}

/**
 * Represents an error that occurred during the instantiation of a smart contract due to a language-specific error.
 * This class extends `ContractInstantiateError` and includes a `LangError` property.
 *
 * Ref: https://use.ink/faq/migrating-from-ink-3-to-4#:~:text=Add%20support%20for,equivalent%20LangError.
 *
 * @template ContractApi - The type of the contract API. Defaults to `GenericContractApi`.
 *
 * @extends ContractInstantiateError
 */
export class ContractInstantiateLangError<
  ContractApi extends InkGenericContractApi = InkGenericContractApi,
> extends ContractInstantiateError<ContractApi> {
  name = 'ContractInstantiateLangError';
  /**
   * The language-specific error that occurred during the instantiation.
   */
  langError: ContractApi['types']['LangError'];
  /**
   * Decoded `ReturnFlags` from contract call result.
   */
  flags: ReturnFlags;

  /**
   * Constructs a new `ContractInstantiateLangError` instance.
   *
   * @param err - The `LangError` that occurred during the instantiation phase.
   * @param raw - The raw result of the contract instantiation.
   */
  constructor(
    err: ContractApi['types']['LangError'],
    raw: ContractInstantiateResult<ContractApi['types']['ChainApi']>,
  ) {
    assert(raw.result.isOk, 'Should not throw DispatchError!');

    super(raw);
    this.langError = err;
    this.flags = toReturnFlags(raw.result.value.result.flags.bits);
    this.message = `Lang error: ${JSON.stringify(err)}`;
  }
}

/**
 * Represents an error that occurred during the execution of a smart contract call.
 * This class extends the base `DedotError` and includes a `raw` property of type `ContractCallResult`.
 *
 * @template ContractApi - The type of the contract API. Defaults to `GenericContractApi`.
 *
 * @extends DedotError
 */
export class ContractExecutionError<ContractApi extends GenericContractApi = GenericContractApi> extends DedotError {
  name = 'ContractExecutionError';
  /**
   * The raw result of the contract call.
   */
  raw: ContractCallResult<ContractApi['types']['ChainApi']>;

  /**
   * Constructs a new `ContractExecutionError` instance.
   *
   * @param raw - The raw result of the contract call.
   */
  constructor(raw: ContractCallResult<ContractApi['types']['ChainApi']>) {
    super();
    this.raw = raw;
  }
}

/**
 * Represents an error that occurred during the execution of a smart contract call due to a dispatch error.
 * This class extends `ContractExecutionError` and includes a `DispatchError` property.
 *
 * @template ContractApi - The type of the contract API. Defaults to `GenericContractApi`.
 *
 * @extends ContractExecutionError
 */
export class ContractDispatchError<
  ContractApi extends GenericContractApi = GenericContractApi,
> extends ContractExecutionError<ContractApi> {
  name = 'ContractDispatchError';
  /**
   * The error that occurred during the dispatch phase.
   */
  dispatchError: DispatchError;
  /**
   * The decoded module error, if any.
   */
  moduleError?: PalletErrorMetadataLatest;

  /**
   * Constructs a new `ContractDispatchError` instance.
   *
   * @param err - The `DispatchError` that occurred during the dispatch phase.
   * @param raw - The raw result of the contract call.
   * @param moduleError - The decoded module error, if any.
   */
  constructor(
    err: DispatchError,
    raw: ContractCallResult<ContractApi['types']['ChainApi']>,
    moduleError?: PalletErrorMetadataLatest,
  ) {
    super(raw);
    this.dispatchError = err;
    this.moduleError = moduleError;
    this.message = formatDispatchError(err, moduleError);
  }
}

/**
 * Represents an error that occurred during the execution of a smart contract call due to a language-specific error.
 * This class extends `ContractExecutionError` and includes a `LangError` property.
 *
 * Ref: https://use.ink/faq/migrating-from-ink-3-to-4#:~:text=Add%20support%20for,equivalent%20LangError.
 *
 * @template ContractApi - The type of the contract API. Defaults to `GenericContractApi`.
 *
 * @extends ContractExecutionError
 */
export class ContractLangError<
  ContractApi extends InkGenericContractApi = InkGenericContractApi,
> extends ContractExecutionError<ContractApi> {
  name = 'ContractLangError';
  /**
   * The language-specific error that occurred during the execution.
   */
  langError: ContractApi['types']['LangError'];
  /**
   * Decoded `ReturnFlags` from contract call result.
   */
  flags: ReturnFlags;

  /**
   * Constructs a new `ContractLangError` instance.
   *
   * @param err - The `LangError` that occurred during the execution phase.
   * @param raw - The raw result of the contract call.
   */
  constructor(err: ContractApi['types']['LangError'], raw: ContractCallResult<ContractApi['types']['ChainApi']>) {
    assert(raw.result.isOk, 'Should not throw DispatchError!');

    super(raw);
    this.langError = err;
    this.flags = toReturnFlags(raw.result.value.flags.bits);
    this.message = `Lang error: ${JSON.stringify(err)}`;
  }
}

export type SolErrorResult = {
  abiItem: SolAbiError;
  args: readonly unknown[] | undefined;
  errorName: string;
};

/**
 * Represents a custom error that occurred during the instantiation of a solidity smart contract.
 * This class extends `ContractInstantiateError` and includes properties for the error name and description.
 *
 * @template ContractApi - The type of the contract API. Defaults to `SolGenericContractApi`.
 *
 * @extends ContractInstantiateError
 */
export class SolContractInstantiateError<
  ContractApi extends SolGenericContractApi = SolGenericContractApi,
> extends ContractInstantiateError {
  name = 'SolContractInstantiateError';
  details?: SolErrorResult;

  constructor(
    raw: ContractInstantiateResult<ContractApi['types']['ChainApi']>,
    { details, message }: { details?: SolErrorResult; message?: string },
  ) {
    super(raw);
    this.details = details;

    if (message) {
      this.message = message;
    } else if (details) {
      this.message = formatSolErrorMessage(details);
    }
  }
}

/**
 * Represents a custom error that occurred during the execution of a smart contract call.
 * This class extends `ContractExecutionError` and includes properties for the error name and description.
 *
 * @template ContractApi - The type of the contract API. Defaults to `SolGenericContractApi`.
 *
 * @extends ContractExecutionError
 */
export class SolContractExecutionError<
  ContractApi extends SolGenericContractApi = SolGenericContractApi,
> extends ContractExecutionError {
  name = 'SolContractExecutionError';
  details?: SolErrorResult;

  constructor(
    raw: ContractCallResult<ContractApi['types']['ChainApi']>,
    { details, message }: { details?: SolErrorResult; message?: string },
  ) {
    super(raw);
    this.details = details;

    if (message) {
      this.message = message;
    } else if (details) {
      this.message = formatSolErrorMessage(details);
    }
  }
}

/**
 * Checks if the provided error is an instance of `ContractExecutionError`.
 *
 * This function is used to determine if a given error is a result of an execution error during a smart contract call.
 *
 * @template ContractApi - The type of the contract API. Defaults to `GenericContractApi`.
 *
 * @param e - The error to be checked.
 *
 * @returns `true` if the error is an instance of `ContractExecutionError`, `false` otherwise.
 */
export function isContractExecutionError<ContractApi extends GenericContractApi = GenericContractApi>(
  e: Error,
): e is ContractExecutionError<ContractApi> {
  return e instanceof ContractExecutionError;
}

/**
 * Checks if the provided error is an instance of `ContractDispatchError`.
 *
 * This function is used to determine if a given error is a result of a dispatch error during a smart contract call.
 *
 * @template ContractApi - The type of the contract API. Defaults to `GenericContractApi`.
 *
 * @param e - The error to be checked. This should be an instance of `Error`.
 *
 * @returns `true` if the error is an instance of `ContractDispatchError`, `false` otherwise.
 *          This function returns a boolean value indicating whether the provided error is of type `ContractDispatchError`.
 */
export function isContractDispatchError<ContractApi extends GenericContractApi = GenericContractApi>(
  e: Error,
): e is ContractDispatchError<ContractApi> {
  return e instanceof ContractDispatchError;
}

/**
 * Checks if the provided error is an instance of `ContractLangError`.
 *
 * This function is used to determine if a given error is a result of a language-specific error during a smart contract call.
 *
 * @template ContractApi - The type of the contract API. Defaults to `GenericContractApi`.
 *
 * @param e - The error to be checked. This should be an instance of `Error`.
 *
 * @returns `true` if the error is an instance of `ContractLangError`, `false` otherwise.
 *          This function returns a boolean value indicating whether the provided error is of type `ContractLangError`.
 */
export function isContractLangError<ContractApi extends InkGenericContractApi = InkGenericContractApi>(
  e: Error,
): e is ContractLangError<ContractApi> {
  return e instanceof ContractLangError;
}

/**
 * Checks if the provided error is an instance of `ContractInstantiateError`.
 *
 * This function is used to determine if a given error is a result of an execution error during the instantiation of a smart contract.
 *
 * @template ContractApi - The type of the contract API. Defaults to `GenericContractApi`.
 *
 * @param e - The error to be checked. This should be an instance of `Error`.
 *
 * @returns `true` if the error is an instance of `ContractInstantiateError`, `false` otherwise.
 *          This function returns a boolean value indicating whether the provided error is of type `ContractInstantiateError`.
 */
export function isContractInstantiateError<ContractApi extends GenericContractApi = GenericContractApi>(
  e: Error,
): e is ContractInstantiateError<ContractApi> {
  return e instanceof ContractInstantiateError;
}

/**
 * Checks if the provided error is an instance of `ContractInstantiateDispatchError`.
 *
 * This function is used to determine if a given error is a result of a dispatch error during the instantiation of a smart contract.
 *
 * @template ContractApi - The type of the contract API. Defaults to `GenericContractApi`.
 *
 * @param e - The error to be checked. This should be an instance of `Error`.
 *
 * @returns `true` if the error is an instance of `ContractInstantiateDispatchError`, `false` otherwise.
 *          This function returns a boolean value indicating whether the provided error is of type `ContractInstantiateDispatchError`.
 */
export function isContractInstantiateDispatchError<ContractApi extends GenericContractApi = GenericContractApi>(
  e: Error,
): e is ContractInstantiateDispatchError<ContractApi> {
  return e instanceof ContractInstantiateDispatchError;
}

/**
 * Checks if the provided error is an instance of `ContractInstantiateLangError`.
 *
 * This function is used to determine if a given error is a result of a language-specific error during the instantiation of a smart contract.
 *
 * @template ContractApi - The type of the contract API. Defaults to `GenericContractApi`.
 *
 * @param e - The error to be checked. This should be an instance of `Error`.
 *
 * @returns `true` if the error is an instance of `ContractInstantiateLangError`, `false` otherwise.
 *          This function returns a boolean value indicating whether the provided error is of type `ContractInstantiateLangError`.
 */
export function isContractInstantiateLangError<ContractApi extends InkGenericContractApi = InkGenericContractApi>(
  e: Error,
): e is ContractInstantiateLangError<ContractApi> {
  return e instanceof ContractInstantiateLangError;
}

/**
 * Checks if the provided error is an instance of `isSolContractExecutionError`.
 * This function is used to determine if a given error is a custom error specific to a smart contract.
 *
 * @template ContractApi - The type of the contract API. Defaults to `SolGenericContractApi`.
 *
 * @param e - The error to be checked. This should be an instance of `Error`.
 *
 * @returns `true` if the error is an instance of `isSolContractExecutionError`, `false` otherwise.
 */
export function isSolContractExecutionError<ContractApi extends SolGenericContractApi = SolGenericContractApi>(
  e: Error,
): e is SolContractExecutionError<ContractApi> {
  return e instanceof SolContractExecutionError;
}

/**
 * Checks if the provided error is an instance of `SolContractInstantiateError`.
 * This function is used to determine if a given error is a custom error specific to the instantiation of a smart contract.
 *
 * @template ContractApi - The type of the contract API. Defaults to `SolGenericContractApi`.
 *
 * @param e - The error to be checked. This should be an instance of `Error`.
 *
 * @returns `true` if the error is an instance of `SolContractInstantiateError`, `false` otherwise.
 */
export function isSolContractInstantiateError<ContractApi extends SolGenericContractApi = SolGenericContractApi>(
  e: Error,
): e is SolContractInstantiateError<ContractApi> {
  return e instanceof SolContractInstantiateError;
}
