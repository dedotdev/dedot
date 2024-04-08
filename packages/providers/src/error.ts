export class JsonRpcError extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
  }
}
