import { TypesGen } from './TypesGen';
import { runtimesSpec, toKnownRuntime } from '@delightfuldot/specs';
import { RuntimeApiSpec, RuntimeSpec } from '@delightfuldot/types';
import { beautifySourceCode, commentBlock, compileTemplate } from './utils';
import { assert, stringSnakeCase } from '@delightfuldot/utils';
import { RpcGen } from './RpcGen';
import { stringCamelCase } from '@polkadot/util';

export class RuntimeCallsGen extends RpcGen {
  constructor(
    readonly typesGen: TypesGen,
    readonly runtimeApis: any[],
  ) {
    super(typesGen, []);
  }
  generate() {
    this.typesGen.clearCache();
    this.typesGen.typeImports.addKnownType('GenericRuntimeCalls', 'GenericRuntimeCall');

    const specsByModule = this.runtimeApis
      .map(([hash, version]) => {
        const runtime = toKnownRuntime(hash);

        if (!runtime) {
          // TODO: Handle unknown runtime
          // console.log('...');
          return;
        }

        const spec = runtimesSpec.find((one) => one.runtime === runtime && one.version === version);

        assert(spec, `Runtime specs not found ${runtime} ${version}`);

        return {
          ...spec,
          hash,
        } as RuntimeSpec;
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
      specs.forEach(({ methods, runtime, hash, version }) => {
        runtimeApisCallsOut += `\n
        /**
         * @runtimeapi: ${runtime} - ${hash}
         * @version: ${version}
        **/\n`;

        runtimeApisCallsOut += `${stringCamelCase(runtime!)}: {
          ${Object.keys(methods)
            .map((method) => this.#generateMethodDef({ ...methods[method], runtime, method }))
            .join('\n')} 
            
        ${commentBlock('Generic runtime call')}[method: string]: GenericRuntimeCall
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
    const defaultDocs = [`@callname: ${callName}`];

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
}
