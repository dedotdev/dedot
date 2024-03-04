import { findAliasRpcSpec, findRpcSpec, isUnsubscribeMethod } from '@dedot/specs';
import { RpcCallSpec, RpcModuleName } from '@dedot/types';
import { isNativeType } from '@dedot/utils';
import { ApiGen, TypesGen } from '../generator';
import { beautifySourceCode, commentBlock, compileTemplate, TUPLE_TYPE_REGEX, WRAPPER_TYPE_REGEX } from './utils';
import { findKnownCodecType } from './known_codecs';

const HIDDEN_RPCS = [
  // Ref: https://github.com/paritytech/polkadot-sdk/blob/43415ef58c143b985e09015cd000dbd65f6d3997/substrate/client/rpc-servers/src/lib.rs#L152C9-L158
  'rpc_methods',
];

export class RpcGen extends ApiGen {
  constructor(
    readonly typesGen: TypesGen,
    readonly rpcMethods: string[],
  ) {
    super(typesGen);
    HIDDEN_RPCS.filter((one) => !rpcMethods.includes(one)).forEach((one) => rpcMethods.push(one));
    rpcMethods.sort();
  }

  generate() {
    this.typesGen.clearCache();
    this.typesGen.typeImports.addKnownType('GenericRpcCalls', 'Unsub', 'Callback', 'GenericRpcCall');

    const specsByModule = this.rpcMethods
      .filter((one) => !findAliasRpcSpec(one)) // we'll ignore  alias rpc for now if defined in the specs! TODO should we generate alias rpc as well?
      .filter((one) => !isUnsubscribeMethod(one)) // we'll ignore unsubscribe method as well
      .map((one) => {
        const spec = findRpcSpec(one);
        if (spec) {
          return spec;
        }

        const [module, ...methodParts] = one.split('_');
        const method = methodParts.join('_');

        return {
          params: [],
          type: 'GenericRpcCall',
          module,
          method,
        } as RpcCallSpec;
      })
      .reduce(
        (o, spec) => {
          const { module, method } = spec;

          // ignore if rpc name does not confront with the general convention
          if (!module || !method) {
            return o;
          }

          return {
            ...o,
            [module]: o[module] ? [...o[module], spec] : [spec],
          };
        },
        {} as Record<RpcModuleName, RpcCallSpec[]>,
      );
    let rpcCallsOut = '';
    Object.keys(specsByModule).forEach((module) => {
      const specs = specsByModule[module];
      // TODO add alias info to docs block!
      rpcCallsOut += `${module}: {
      ${specs.map((spec) => this.#generateMethodDef(spec)).join(',\n')},

      [method: string]: GenericRpcCall,
    },`;
    });

    // TODO include & define external types

    const importTypes = this.typesGen.typeImports.toImports();
    const template = compileTemplate('rpc.hbs');

    return beautifySourceCode(template({ importTypes, rpcCallsOut }));
  }

  #generateMethodDef(spec: RpcCallSpec) {
    const { name, type, module, method, docs = [], params, pubsub, deprecated } = spec;

    const rpcName = name || `${module}_${method}`;
    let defaultDocs = [`@rpcname: ${rpcName}`];
    if (deprecated) {
      defaultDocs.push(`@deprecated: ${deprecated}`);
    }

    if (type === 'GenericRpcCall' && params.length === 0) {
      return `${commentBlock(defaultDocs)}${method}: GenericRpcCall`;
    }

    this.addTypeImport(type, false);
    params.forEach(({ type, isScale }) => {
      this.addTypeImport(type, !!isScale);
    });

    const typedParams = params.map((param) => ({
      ...param,
      plainType: this.getGeneratedTypeName(param.type, !!param.isScale),
    }));

    const isSubscription = !!pubsub;

    const paramsOut = typedParams.map(
      ({ name, type, isOptional, isScale, plainType }) => `${name}${isOptional ? '?' : ''}: ${plainType}`,
    );

    const paramsDoc = typedParams.map(({ name, plainType }) => `@param {${plainType}} ${name}`);

    const typeOut = this.getGeneratedTypeName(type, false);

    if (isSubscription) {
      defaultDocs.shift();
      defaultDocs.unshift(`@pubsub: ${pubsub?.join(', ')}`);

      paramsOut.push(`callback: Callback<${typeOut}>`);
      return `${commentBlock(docs, '\n', defaultDocs, paramsDoc)}${method}: GenericRpcCall<(${paramsOut.join(
        ', ',
      )}) => Promise<Unsub>>`;
    } else {
      return `${commentBlock(docs, '\n', defaultDocs, paramsDoc)}${method}: GenericRpcCall<(${paramsOut.join(
        ', ',
      )}) => Promise<${typeOut}>>`;
    }
  }

  // TODO check typeIn, typeOut if param type, or rpc type isScale
  addTypeImport(type: string | string[], toTypeIn = true) {
    if (Array.isArray(type)) {
      type.forEach((one) => this.addTypeImport(one, toTypeIn));
      return;
    }

    type = type.trim();

    if (isNativeType(type)) {
      return;
    }

    // Handle generic wrapper types
    const matchArray = type.match(WRAPPER_TYPE_REGEX);
    if (matchArray) {
      const [_, $1, $2] = matchArray;
      this.addTypeImport($1, toTypeIn);

      if ($2.match(WRAPPER_TYPE_REGEX) || $2.match(TUPLE_TYPE_REGEX)) {
        this.addTypeImport($2, toTypeIn);
      } else {
        this.addTypeImport($2.split(','), toTypeIn);
      }

      return;
    }

    // Check tuple type
    if (type.match(TUPLE_TYPE_REGEX)) {
      this.addTypeImport(type.slice(1, -1).split(','), toTypeIn);
      return;
    }

    if (type.includes(' | ')) {
      this.addTypeImport(
        type.split(' | ').map((one) => one.trim()),
        toTypeIn,
      );
      return;
    }

    try {
      const codecType = this.#getCodecType(type, toTypeIn);
      if (isNativeType(codecType)) return;

      this.typesGen.typeImports.addCodecType(codecType);
      return;
    } catch (e) {}

    this.typesGen.addTypeImport(type);
  }

  getGeneratedTypeName(type: string, toTypeIn = true): string {
    try {
      const matchArray = type.match(WRAPPER_TYPE_REGEX);
      if (matchArray) {
        const [_, $1, $2] = matchArray;
        const wrapperTypeName = this.#getCodecType($1, toTypeIn);

        if ($2.match(WRAPPER_TYPE_REGEX) || $2.match(TUPLE_TYPE_REGEX)) {
          return `${wrapperTypeName}<${this.getGeneratedTypeName($2, toTypeIn)}>`;
        }

        const innerTypeNames = $2
          .split(',')
          .map((one) => this.getGeneratedTypeName(one.trim(), toTypeIn))
          .join(', ');

        return `${wrapperTypeName}<${innerTypeNames}>`;
      } else if (type.match(TUPLE_TYPE_REGEX)) {
        const innerTypeNames = type
          .slice(1, -1)
          .split(',')
          .map((one) => this.getGeneratedTypeName(one.trim(), toTypeIn))
          .join(', ');

        return `[${innerTypeNames}]`;
      }

      return this.#getCodecType(type, toTypeIn);
    } catch (e) {}

    return type;
  }

  #getCodecType(type: string, toTypeIn = true) {
    const { typeIn, typeOut } = findKnownCodecType(type);
    return toTypeIn ? typeIn : typeOut;
  }
}
