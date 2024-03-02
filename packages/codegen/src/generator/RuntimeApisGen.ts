import { TypesGen } from './TypesGen';
import { RuntimeApiNames, RuntimeApiSpecs } from '@dedot/specs';
import { RuntimeApiMethodSpec, RuntimeApiSpec } from '@dedot/types';
import { beautifySourceCode, commentBlock, compileTemplate } from './utils';
import { calculateRuntimeApiHash, stringSnakeCase } from '@dedot/utils';
import { RpcGen } from './RpcGen';
import { stringCamelCase } from '@polkadot/util';
import { RuntimeApiMethodDefLatest } from '@dedot/codecs';

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
      const specs = this.#targetRuntimeApiSpecs();

      specs.forEach(({ methods, runtimeApiName, runtimeApiHash, version }) => {
        runtimeCallsOut += commentBlock(`@runtimeapi: ${runtimeApiName} - ${runtimeApiHash}`, `@version: ${version}`);
        runtimeCallsOut += `${stringCamelCase(runtimeApiName!)}: {
            ${Object.keys(methods)
              .map((methodName) =>
                this.#generateMethodDefFromSpec({
                  ...methods[methodName],
                  runtimeApiName,
                  methodName,
                }),
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

  #isOptionalType(type: string) {
    return type.startsWith('Option<') || type.endsWith('| undefined');
  }

  #isOptionalParam(params: { type?: string }[], type: string, idx: number) {
    return this.#isOptionalType(type) && params.slice(idx + 1).every(({ type }) => this.#isOptionalType(type!));
  }

  #generateMethodDefFromSpec(spec: RuntimeApiMethodSpec) {
    const { docs = [], params, type, runtimeApiName, methodName } = spec;

    const callName = `${runtimeApiName}_${stringSnakeCase(methodName)}`;
    const defaultDocs = [`@callname: ${callName}`];

    this.addTypeImport(type!, false);
    params.forEach(({ type }) => this.addTypeImport(type!));

    const typedParams = params.map((param, idx) => ({
      ...param,
      isOptional: this.#isOptionalParam(params, param.type!, idx),
      plainType: this.getGeneratedTypeName(param.type!),
    }));

    const paramsOut = typedParams
      .map(({ name, isOptional, plainType }) => `${stringCamelCase(name)}${isOptional ? '?' : ''}: ${plainType}`)
      .join(', ');

    const typeOut = this.getGeneratedTypeName(type!, false);

    return `${commentBlock(
      docs,
      '\n',
      defaultDocs,
      typedParams.map(({ plainType, name }) => `@param {${plainType}} ${name}`),
    )}${methodName}: GenericRuntimeApiMethod<(${paramsOut}) => Promise<${typeOut}>>`;
  }

  #generateMethodDef(runtimeApiName: string, methodDef: RuntimeApiMethodDefLatest) {
    const { name: methodName, inputs, output, docs } = methodDef;

    const callName = `${runtimeApiName}_${stringSnakeCase(methodName)}`;
    const defaultDocs = [`@callname: ${callName}`];

    const typeOut = this.typesGen.generateType(output, 1, true);
    this.addTypeImport(typeOut, false);
    const typedInputs = inputs
      .map((input, idx) => ({
        ...input,
        type: this.typesGen.generateType(input.typeId, 1),
      }))
      .map((input, idx, inputs) => ({
        ...input,
        isOptional: this.#isOptionalParam(inputs, input.type, idx),
      }));

    this.addTypeImport(typedInputs.map((t) => t.type));

    const paramsOut = typedInputs
      .map(({ name, type, isOptional }) => `${stringCamelCase(name)}${isOptional ? '?' : ''}: ${type}`)
      .join(', ');

    return `${commentBlock(
      docs,
      '\n',
      defaultDocs,
      typedInputs.map(({ type, name }) => `@param {${type}} ${name}`),
    )}${stringCamelCase(methodName)}: GenericRuntimeApiMethod<(${paramsOut}) => Promise<${typeOut}>>`;
  }

  #targetRuntimeApiSpecs(): RuntimeApiSpec[] {
    const specs = this.runtimeApis.map(([runtimeApiHash, version]) => {
      const runtimeApiSpec = this.#findRuntimeApiSpec(runtimeApiHash, version);

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

  #findRuntimeApiSpec = (runtimeApiHash: string, version: number) => {
    const runtimeApiName = RuntimeApiNames.find((one) => calculateRuntimeApiHash(one) === runtimeApiHash);

    return RuntimeApiSpecs.find((one) => one.runtimeApiName === runtimeApiName && one.version === version);
  };
}
