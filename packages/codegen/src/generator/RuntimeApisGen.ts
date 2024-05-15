import { RuntimeApiMethodDefLatest } from '@dedot/codecs';
import { getRuntimeApiNames, getRuntimeApiSpecs } from '@dedot/runtime-specs';
import { RuntimeApiMethodSpec, RuntimeApiSpec } from '@dedot/types';
import { calcRuntimeApiHash, stringSnakeCase, stringCamelCase } from '@dedot/utils';
import { ApiGen } from './ApiGen.js';
import { TypesGen } from './TypesGen.js';
import { findKnownCodecType } from './known-codecs.js';
import {
  beautifySourceCode,
  commentBlock,
  compileTemplate,
  isNativeType,
  TUPLE_TYPE_REGEX,
  WRAPPER_TYPE_REGEX,
} from './utils.js';

export class RuntimeApisGen extends ApiGen {
  constructor(
    readonly typesGen: TypesGen,
    readonly runtimeApis: Record<string, number>,
  ) {
    super(typesGen);
  }

  generate(useSubPaths: boolean = false) {
    this.typesGen.clearCache();
    this.typesGen.typeImports.addKnownType('GenericRuntimeApis', 'GenericRuntimeApiMethod', 'RpcVersion');

    let runtimeCallsOut = '';

    if (this.metadata.apis.length > 0) {
      this.metadata.apis.forEach((runtimeApi) => {
        const { name: runtimeApiName, methods } = runtimeApi;

        runtimeCallsOut += commentBlock(`@runtimeapi: ${runtimeApiName} - ${calcRuntimeApiHash(runtimeApiName)}`);
        runtimeCallsOut += `${stringCamelCase(runtimeApiName)}: {
            ${methods.map((method) => this.#generateMethodDef(runtimeApiName, method)).join('\n')} 
              
            ${commentBlock('Generic runtime api call')}[method: string]: GenericRuntimeApiMethod<Rv>
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
              
            ${commentBlock('Generic runtime api call')}[method: string]: GenericRuntimeApiMethod<Rv>
          }`;
      });
    }

    const importTypes = this.typesGen.typeImports.toImports({ useSubPaths });
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

    this.#addTypeImport(type!, false);
    params.forEach(({ type }) => this.#addTypeImport(type!));

    const typedParams = params.map((param, idx) => ({
      ...param,
      isOptional: this.#isOptionalParam(params, param.type!, idx),
      plainType: this.#getGeneratedTypeName(param.type!),
    }));

    const paramsOut = typedParams
      .map(({ name, isOptional, plainType }) => `${stringCamelCase(name)}${isOptional ? '?' : ''}: ${plainType}`)
      .join(', ');

    const typeOut = this.#getGeneratedTypeName(type!, false);

    return `${commentBlock(
      docs,
      '\n',
      defaultDocs,
      typedParams.map(({ plainType, name }) => `@param {${plainType}} ${name}`),
    )}${methodName}: GenericRuntimeApiMethod<Rv, (${paramsOut}) => Promise<${typeOut}>>`;
  }

  #generateMethodDef(runtimeApiName: string, methodDef: RuntimeApiMethodDefLatest) {
    const { name: methodName, inputs, output, docs } = methodDef;

    const callName = `${runtimeApiName}_${stringSnakeCase(methodName)}`;
    const defaultDocs = [`@callname: ${callName}`];

    const typeOut = this.typesGen.generateType(output, 1, true);
    this.#addTypeImport(typeOut, false);
    const typedInputs = inputs
      .map((input, idx) => ({
        ...input,
        type: this.typesGen.generateType(input.typeId, 1),
      }))
      .map((input, idx, inputs) => ({
        ...input,
        isOptional: this.#isOptionalParam(inputs, input.type, idx),
      }));

    this.#addTypeImport(typedInputs.map((t) => t.type));

    const paramsOut = typedInputs
      .map(({ name, type, isOptional }) => `${stringCamelCase(name)}${isOptional ? '?' : ''}: ${type}`)
      .join(', ');

    return `${commentBlock(
      docs,
      '\n',
      defaultDocs,
      typedInputs.map(({ type, name }) => `@param {${type}} ${name}`),
    )}${stringCamelCase(methodName)}: GenericRuntimeApiMethod<Rv, (${paramsOut}) => Promise<${typeOut}>>`;
  }

  #targetRuntimeApiSpecs(): RuntimeApiSpec[] {
    const specs = Object.entries(this.runtimeApis).map(([runtimeApiHash, version]) => {
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
    const runtimeApiName = getRuntimeApiNames().find((one) => calcRuntimeApiHash(one) === runtimeApiHash);

    return getRuntimeApiSpecs().find((one) => one.runtimeApiName === runtimeApiName && one.version === version);
  };

  // TODO check typeIn, typeOut if param type, or rpc type isScale
  #addTypeImport(type: string | string[], toTypeIn = true) {
    if (Array.isArray(type)) {
      type.forEach((one) => this.#addTypeImport(one, toTypeIn));
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
      this.#addTypeImport($1, toTypeIn);

      if ($2.match(WRAPPER_TYPE_REGEX) || $2.match(TUPLE_TYPE_REGEX)) {
        this.#addTypeImport($2, toTypeIn);
      } else {
        this.#addTypeImport($2.split(','), toTypeIn);
      }

      return;
    }

    // Check tuple type
    if (type.match(TUPLE_TYPE_REGEX)) {
      this.#addTypeImport(type.slice(1, -1).split(','), toTypeIn);
      return;
    }

    if (type.includes(' | ')) {
      this.#addTypeImport(
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

  #getGeneratedTypeName(type: string, toTypeIn = true): string {
    try {
      const matchArray = type.match(WRAPPER_TYPE_REGEX);
      if (matchArray) {
        const [_, $1, $2] = matchArray;
        const wrapperTypeName = this.#getCodecType($1, toTypeIn);

        if ($2.match(WRAPPER_TYPE_REGEX) || $2.match(TUPLE_TYPE_REGEX)) {
          return `${wrapperTypeName}<${this.#getGeneratedTypeName($2, toTypeIn)}>`;
        }

        const innerTypeNames = $2
          .split(',')
          .map((one) => this.#getGeneratedTypeName(one.trim(), toTypeIn))
          .join(', ');

        return `${wrapperTypeName}<${innerTypeNames}>`;
      } else if (type.match(TUPLE_TYPE_REGEX)) {
        const innerTypeNames = type
          .slice(1, -1)
          .split(',')
          .map((one) => this.#getGeneratedTypeName(one.trim(), toTypeIn))
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
