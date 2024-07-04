import { DispatchError } from '@dedot/codecs';
import { GenericSubstrateApi } from '@dedot/types';
import { DedotError } from '@dedot/utils';
import { ContractCallResult } from './types';

export class ContractDispatchError<ChainApi extends GenericSubstrateApi> extends DedotError {
  err: DispatchError;
  raw: ContractCallResult<ChainApi>;

  constructor(err: DispatchError, raw: ContractCallResult<ChainApi>) {
    super();
    this.err = err;
    this.raw = raw;
  }
}

/*
 * LangError represents an error which comes from the smart contracting language itself
 * Ref: https://use.ink/faq/migrating-from-ink-3-to-4#:~:text=Add%20support%20for,equivalent%20LangError.
 */
export class ContractLangError<
  LangError extends any,
  ChainApi extends GenericSubstrateApi,
> extends DedotError {
  err: LangError;
  raw: ContractCallResult<ChainApi>;

  constructor(err: LangError, raw: ContractCallResult<ChainApi>) {
    super();
    this.err = err;
    this.raw = raw;
  }
}
