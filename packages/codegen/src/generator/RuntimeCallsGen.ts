import { TypesGen } from './TypesGen';
import { findRuntimeApiSpec } from '@delightfuldot/specs';
import { RuntimeCallSpec, RuntimeApiSpec } from '@delightfuldot/types';
import { beautifySourceCode, commentBlock, compileTemplate } from './utils';
import { stringSnakeCase } from '@delightfuldot/utils';
import { RpcGen } from './RpcGen';
import { stringCamelCase } from '@polkadot/util';

export class RuntimeCallsGen extends RpcGen {
  constructor(
    readonly typesGen: TypesGen,
    readonly runtimeApis: [string, number][],
  ) {
    super(typesGen, []);
  }
  generate() {
    this.typesGen.clearCache();
    this.typesGen.typeImports.addKnownType('GenericRuntimeCalls', 'GenericRuntimeCall');

    const specsByModule = this.#runtimeApisSpecsByModule();

    let runtimeCallsOut = '';

    Object.values(specsByModule).forEach((specs) => {
      specs.forEach(({ methods, runtimeApiName, runtimeApiHash, version }) => {
        runtimeCallsOut += commentBlock(`@runtimeapi: ${runtimeApiName} - ${runtimeApiHash}`, `@version: ${version}`);
        runtimeCallsOut += `${stringCamelCase(runtimeApiName!)}: {
          ${Object.keys(methods)
            .map((methodName) => this.#generateMethodDef({ ...methods[methodName], runtimeApiName, methodName }))
            .join('\n')} 
            
        ${commentBlock('Generic runtime call')}[method: string]: GenericRuntimeCall
        }`;
      });
    });

    const importTypes = this.typesGen.typeImports.toImports();
    const template = compileTemplate('runtime.hbs');

    return beautifySourceCode(template({ importTypes, runtimeCallsOut }));
  }

  #generateMethodDef(spec: RuntimeCallSpec) {
    const { docs = [], params, type, runtimeApiName, methodName } = spec;

    const callName = `${runtimeApiName}_${stringSnakeCase(methodName)}`;
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
    )}${methodName}: GenericRuntimeCall<(${paramsOut}) => Promise<${typeOut}>>`;
  }

  #runtimeApisSpecsByModule(): Record<string, RuntimeApiSpec[]> {
    const specs = this.runtimeApis.map(([runtimeApiHash, version]) => {
      const runtimeApiSpec = findRuntimeApiSpec(runtimeApiHash, version);

      if (!runtimeApiSpec) return;

      return {
        ...runtimeApiSpec,
        runtimeApiHash,
      } as RuntimeApiSpec;
    });

    return specs.reduce(
      (o, spec) => {
        if (!spec) {
          return o;
        }

        const { moduleName } = spec;

        if (!moduleName) {
          return o;
        }

        return {
          ...o,
          [moduleName]: o[moduleName] ? [...o[moduleName], spec] : [spec],
        };
      },
      {} as Record<string, RuntimeApiSpec[]>,
    );
  }
}
