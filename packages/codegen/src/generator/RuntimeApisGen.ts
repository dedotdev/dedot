import { TypesGen } from './TypesGen';
import { findRuntimeApiSpec } from '@delightfuldot/specs';
import { RuntimeApiMethodSpec, RuntimeApiSpec } from '@delightfuldot/types';
import { beautifySourceCode, commentBlock, compileTemplate } from './utils';
import { calculateRuntimeApiHash, stringSnakeCase } from '@delightfuldot/utils';
import { RpcGen } from './RpcGen';
import { stringCamelCase } from '@polkadot/util';
import { RuntimeApiMethodDefLatest } from '@delightfuldot/codecs';

export class RuntimeApisGen extends RpcGen {
  constructor(
    readonly typesGen: TypesGen,
    readonly runtimeApis: [string, number][],
  ) {
    super(typesGen, []);
  }

  generate() {
    this.typesGen.clearCache();
    this.typesGen.typeImports.addKnownType('GenericRuntimeApis', 'GenericRuntimeApiMethod');

    let runtimeCallsOut = '';

    if (this.metadata.apis.length > 0) {
      this.metadata.apis.forEach((runtimeApi) => {
        const { name: runtimeApiName, methods } = runtimeApi;

        runtimeCallsOut += commentBlock(`@runtimeapi: ${runtimeApiName} - ${calculateRuntimeApiHash(runtimeApiName)}`);
        runtimeCallsOut += `${stringCamelCase(runtimeApiName)}: {
            ${methods.map((method) => this.#generateMethodDef(runtimeApiName, method)).join('\n')} 
              
            ${commentBlock('Generic runtime api call')}[method: string]: GenericRuntimeApiMethod
        }`;
      });
    } else {
      const specs = this.#runtimeApisSpecsByModule();

      specs.forEach(({ methods, runtimeApiName, runtimeApiHash, version }) => {
        runtimeCallsOut += commentBlock(`@runtimeapi: ${runtimeApiName} - ${runtimeApiHash}`, `@version: ${version}`);
        runtimeCallsOut += `${stringCamelCase(runtimeApiName!)}: {
            ${Object.keys(methods)
              .map((methodName) =>
                this.#generateMethodDefFromSpec({ ...methods[methodName], runtimeApiName, methodName }),
              )
              .join('\n')} 
              
            ${commentBlock('Generic runtime api call')}[method: string]: GenericRuntimeApiMethod
          }`;
      });
    }

    const importTypes = this.typesGen.typeImports.toImports();
    const template = compileTemplate('runtime.hbs');

    return beautifySourceCode(template({ importTypes, runtimeCallsOut }));
  }

  #generateMethodDefFromSpec(spec: RuntimeApiMethodSpec) {
    const { docs = [], params, type, runtimeApiName, methodName } = spec;

    const callName = `${runtimeApiName}_${stringSnakeCase(methodName)}`;
    const defaultDocs = [`@callname: ${callName}`];

    this.addTypeImport(type!, false);
    params.forEach(({ type }) => {
      this.addTypeImport(type!);
    });

    const paramsOut = params
      .map(({ name, type }) => `${stringCamelCase(name)}: ${this.getGeneratedTypeName(type!)}`)
      .join(', ');

    const typeOut = this.getGeneratedTypeName(type!, false);

    return `${commentBlock(
      docs,
      '\n',
      defaultDocs,
    )}${methodName}: GenericRuntimeApiMethod<(${paramsOut}) => Promise<${typeOut}>>`;
  }

  #generateMethodDef(runtimeApiName: string, methodDef: RuntimeApiMethodDefLatest) {
    const { name: methodName, inputs, output, docs } = methodDef;

    const callName = `${runtimeApiName}_${stringSnakeCase(methodName)}`;
    const defaultDocs = [`@callname: ${callName}`];

    const outputType = this.typesGen.generateType(output, 1, true);
    this.addTypeImport(outputType, false);
    const typedInputs = inputs.map((input) => ({
      ...input,
      type: this.typesGen.generateType(input.typeId, 1),
    }));

    this.addTypeImport(typedInputs.map((t) => t.type));

    const paramsOut = typedInputs.map(({ name, type }) => `${stringCamelCase(name)}: ${type}`).join(', ');

    return `${commentBlock(docs, '\n', defaultDocs)}${stringCamelCase(
      methodName,
    )}: GenericRuntimeApiMethod<(${paramsOut}) => Promise<${outputType}>>`;
  }

  #runtimeApisSpecsByModule(): RuntimeApiSpec[] {
    const specs = this.runtimeApis.map(([runtimeApiHash, version]) => {
      const runtimeApiSpec = findRuntimeApiSpec(runtimeApiHash, version);

      if (!runtimeApiSpec) return;

      return {
        ...runtimeApiSpec,
        runtimeApiHash,
      } as RuntimeApiSpec;
    });

    return specs.reduce((o, spec) => {
      if (!spec) {
        return o;
      }

      return [...o, spec];
    }, [] as RuntimeApiSpec[]);
  }
}
