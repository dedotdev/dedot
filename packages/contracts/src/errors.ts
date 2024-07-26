import { DispatchError } from '@dedot/codecs';
import { DedotError } from '@dedot/utils';
import { ContractCallResult, ContractInstantiateResult, GenericContractApi } from './types';

export class ContractInstantiateExecutionError<
  ContractApi extends GenericContractApi = GenericContractApi,
> extends DedotError {
  raw: ContractInstantiateResult<ContractApi['types']['ChainApi']>;

  constructor(raw: ContractInstantiateResult<ContractApi['types']['ChainApi']>) {
    super();
    this.raw = raw;
  }
}

export class ContractInstantiateDispatchError<
  ContractApi extends GenericContractApi = GenericContractApi,
> extends ContractInstantiateExecutionError<ContractApi> {
  err: DispatchError;

  constructor(err: DispatchError, raw: ContractInstantiateResult<ContractApi['types']['ChainApi']>) {
    super(raw);
    this.err = err;
  }
}

/*
 * LangError represents an error which comes from the smart contracting language itself
 * Ref: https://use.ink/faq/migrating-from-ink-3-to-4#:~:text=Add%20support%20for,equivalent%20LangError.
 */
export class ContractInstantiateLangError<
  ContractApi extends GenericContractApi = GenericContractApi,
> extends ContractInstantiateExecutionError<ContractApi> {
  err: ContractApi['types']['LangError'];

  constructor(
    err: ContractApi['types']['LangError'],
    raw: ContractInstantiateResult<ContractApi['types']['ChainApi']>,
  ) {
    super(raw);
    this.err = err;
  }
}

export class ContractExecutionError<ContractApi extends GenericContractApi = GenericContractApi> extends DedotError {
  raw: ContractCallResult<ContractApi['types']['ChainApi']>;

  constructor(raw: ContractCallResult<ContractApi['types']['ChainApi']>) {
    super();
    this.raw = raw;
  }
}

export class ContractDispatchError<
  ContractApi extends GenericContractApi = GenericContractApi,
> extends ContractExecutionError<ContractApi> {
  err: DispatchError;

  constructor(err: DispatchError, raw: ContractCallResult<ContractApi['types']['ChainApi']>) {
    super(raw);
    this.err = err;
  }
}

/*
 * LangError represents an error which comes from the smart contracting language itself
 * Ref: https://use.ink/faq/migrating-from-ink-3-to-4#:~:text=Add%20support%20for,equivalent%20LangError.
 */
export class ContractLangError<
  ContractApi extends GenericContractApi = GenericContractApi,
> extends ContractExecutionError<ContractApi> {
  err: ContractApi['types']['LangError'];

  constructor(err: ContractApi['types']['LangError'], raw: ContractCallResult<ContractApi['types']['ChainApi']>) {
    super(raw);
    this.err = err;
  }
}

export function isContractExecutionError<ContractApi extends GenericContractApi = GenericContractApi>(
  e: Error,
): e is ContractExecutionError<ContractApi> {
  return e instanceof ContractExecutionError;
}

export function isContractDispatchError<ContractApi extends GenericContractApi = GenericContractApi>(
  e: Error,
): e is ContractDispatchError<ContractApi> {
  return e instanceof ContractDispatchError;
}

export function isContractLangError<ContractApi extends GenericContractApi = GenericContractApi>(
  e: Error,
): e is ContractLangError<ContractApi> {
  return e instanceof ContractLangError;
}

export function isContractInstantiateExecutionError<ContractApi extends GenericContractApi = GenericContractApi>(
  e: Error,
): e is ContractInstantiateExecutionError<ContractApi> {
  return e instanceof ContractInstantiateExecutionError;
}

export function isContractInstantiateDispatchError<ContractApi extends GenericContractApi = GenericContractApi>(
  e: Error,
): e is ContractInstantiateDispatchError<ContractApi> {
  return e instanceof ContractInstantiateDispatchError;
}

export function isContractInstantiateLangError<ContractApi extends GenericContractApi = GenericContractApi>(
  e: Error,
): e is ContractInstantiateLangError<ContractApi> {
  return e instanceof ContractInstantiateLangError;
}
