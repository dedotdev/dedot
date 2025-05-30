import { DedotError } from '@dedot/utils';
import { JsonRpcErrorObject } from './json-rpc.js';

export const UNKNOWN_ERROR_CODE = -99999;

export class JsonRpcError<Data = any> extends Error {
  code: number;
  data?: Data;

  constructor(e: JsonRpcErrorObject<Data>);
  constructor(eOrMsg: string | JsonRpcErrorObject<Data>, code: number = UNKNOWN_ERROR_CODE, data?: Data) {
    if (typeof eOrMsg === 'string') {
      super(`${code}: ${eOrMsg}`);
      this.code = code;
      this.data = data;
    } else {
      const { message, code, data } = eOrMsg;
      super(`${code}: ${message}`);
      this.code = code;
      this.data = data;
    }
  }
}

export class MaxRetryAttemptedError extends DedotError {}
