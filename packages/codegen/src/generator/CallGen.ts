import { ApiGen } from './ApiGen';
import { TypesGen } from './TypesGen';
import { runtimesSpec, toKnownRuntime } from '@delightfuldot/specs';
import { RuntimeApiSpec, RuntimeSpec } from '@delightfuldot/types';
import { beautifySourceCode, commentBlock, compileTemplate, WRAPPER_TYPE_REGEX } from './utils';
import { assert, isNativeType, stringSnakeCase } from '@delightfuldot/utils';
import { blake2AsHex } from '@polkadot/util-crypto';

export class CallGen extends ApiGen {
  constructor(
    readonly typesGen: TypesGen,
    readonly runtime: any[],
  ) {
    super(typesGen);
  }
  generate() {
    this.typesGen.clearCache();
    this.typesGen.typeImports.addKnownType('GenericRuntimeCalls', 'GenericRuntimeCall');

    const specsByModule = this.runtime
      .map(([runtimeHash, version]) => {
        const runtime = toKnownRuntime(runtimeHash);

        if (!runtime) {
          // TODO: Handle unknown runtime
          return;
        }

        const spec = runtimesSpec.find((one) => one.runtime === runtime && one.version === version);

        assert(spec, `Runtime specs not found ${runtime} ${version}`);

        return spec;
      })
      .reduce(
        (o, spec) => {
          if (!spec) {
            return o;
          }

          const { module, runtime } = spec;

          if (!module || !runtime) {
            return o;
          }

          return {
            ...o,
            [module]: o[module] ? [...o[module], spec] : [spec],
          };
        },
        {} as Record<string, RuntimeSpec[]>,
      );

    let runtimeApisCallsOut = '';
    Object.values(specsByModule).forEach((specs) => {
      specs.forEach(({ methods, runtime, module, version }) => {
        runtimeApisCallsOut += `\n
        /**
         * @module: ${module}
         * @runtimehash: ${blake2AsHex(runtime!, 64)}
         * @version: ${version}
        **/\n`;

        runtimeApisCallsOut += `${runtime}: {
          ${Object.keys(methods)
            .map((method) => this.#generateMethodDef({ ...methods[method], runtime, method }))
            .join('\n')} 
            
        [method: string]: GenericRuntimeCall
        }`;
      });
    });

    const importTypes = this.typesGen.typeImports.toImports();
    const template = compileTemplate('call.hbs');

    return beautifySourceCode(template({ importTypes, runtimeApisCallsOut }));
  }

  #generateMethodDef(spec: RuntimeApiSpec) {
    const { docs = [], params, type, runtime, method } = spec;

    const callName = `${runtime}_${stringSnakeCase(method)}`;
    const defaultDocs = [`@call: ${callName}`];

    this.addTypeImport(type, false);
    params.forEach(({ type }) => {
      this.addTypeImport(type);
    });

    const paramsOut = params.map(({ name, type }) => `${name}: ${this.getGeneratedTypeName(type)}`).join(', ');

    const typeOut = this.getGeneratedTypeName(type, false);

    return `${commentBlock(
      docs,
      '\n',
      defaultDocs,
    )}${method}: GenericRuntimeCall<(${paramsOut}) => Promise<${typeOut}>>`;
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

    // TODO handle for generic wrapper types
    const matchArray = type.match(WRAPPER_TYPE_REGEX);
    if (matchArray) {
      const [_, $1, $2] = matchArray;
      this.addTypeImport($1, toTypeIn);
      this.addTypeImport(
        $2.split(',').map((one) => one.trim()),
        toTypeIn,
      );
      return;
    }

    // Check tuple type
    if (type.startsWith('[') && type.endsWith(']')) {
      this.addTypeImport(type.slice(1, -1).split(','));
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
      this.typesGen.typeImports.addCodecType(this.#getCodecType(type, toTypeIn));
      return;
    } catch (e) {}

    this.typesGen.addTypeImport(type);
  }

  getGeneratedTypeName(type: string, toTypeIn = true) {
    try {
      const matchArray = type.match(WRAPPER_TYPE_REGEX);
      if (matchArray) {
        const [_, $1, $2] = matchArray;
        return `${this.#getCodecType($1, toTypeIn)}<${this.#getCodecType($2, toTypeIn)}>`;
      }

      return this.#getCodecType(type, toTypeIn);
    } catch (e) {}

    return type;
  }

  #getCodecType(type: string, toTypeIn = true) {
    const { typeIn, typeOut } = this.registry.findCodecType(type);
    return toTypeIn ? typeIn : typeOut;
  }
}
