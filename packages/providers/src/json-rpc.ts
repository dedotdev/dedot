// JSON-RPC v2 types
// Specs: https://www.jsonrpc.org/specification

export type JsonRpcRequestId = number;
export interface JsonRpcV2 {
  id: JsonRpcRequestId;
  jsonrpc: '2.0';
}

export interface JsonRpcRequest extends JsonRpcV2 {
  method: string;
  params: unknown[];
}

export interface JsonRpcErrorObject<D = any> {
  code: number;
  message: string;
  data?: D;
}

export interface JsonRpcResponseError<D = any> {
  error?: JsonRpcErrorObject<D>;
}

export interface JsonRpcResponseSuccess<T = any> {
  result?: T;
}

// https://www.jsonrpc.org/specification#notification
export interface JsonRpcResponseNotification<T = any> {
  jsonrpc: '2.0';
  method: string;
  params: {
    subscription: number | string;
    result?: T;
  } & JsonRpcResponseError;
}

export type JsonRpcResponse<T = any> = JsonRpcV2 & JsonRpcResponseSuccess<T> & JsonRpcResponseError;
