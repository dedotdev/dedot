import { LegacyClient } from '@dedot/api';
import { $Metadata, Metadata, TypeDef } from '@dedot/codecs';
import { checkKnownCodecType } from '@dedot/codegen';
import { WsProvider } from '@dedot/providers';
import { assert, stringCamelCase, stringPascalCase, u8aToHex } from '@dedot/utils';
import { glob } from 'glob';
import * as fs from 'node:fs';
import ora from 'ora';
import * as path from 'path';
import ts from 'typescript';
import { CommandModule } from 'yargs';
import { addToMap, reduceFieldSize } from './utils';

enum CallTypes {
  Query = 'query',
  Call = 'call',
  Extrinsic = 'tx',
  Events = 'events',
  Consts = 'consts',
  Errors = 'errors',
}

const CALL_TYPEs = [
  CallTypes.Query,
  CallTypes.Extrinsic,
  CallTypes.Call,
  CallTypes.Events,
  CallTypes.Consts,
  CallTypes.Errors,
];

const WHITE_TYPE_DEF: TypeDef = {
  type: 'Enum',
  value: { members: [] },
};

type Args = {
  wsUrl?: string;
  filesPath?: string;
  output?: string;
  debug?: string;
};

enum Debug {
  Calls = 'calls',
  JSON = 'json',
  All = 'all',
}

export const compact: CommandModule<Args, Args> = {
  command: 'compact',
  describe: 'Generate compact metadata for substrate-based chain',
  handler: async (yargs) => {
    const { wsUrl, output = '', filesPath = '', debug } = yargs;

    assert(wsUrl, 'Not support non-wsUrl now!');

    const spinner = ora('Loading metadata').start();
    const api = await LegacyClient.new(new WsProvider(wsUrl));
    spinner.succeed('Fetching metadata successfully!');

    spinner.text = 'Looking up files';
    const files = await lookUpFiles(filesPath);
    spinner.succeed('Looking up files done!');

    spinner.text = 'Detecting api calls';
    const called = detectingCalls(files);
    spinner.succeed(`Found ${called.length} calls`);
    if (debug === Debug.Calls || debug === Debug.All) {
      called.forEach((one) => {
        console.info(` - ${one.join('.')}`);
      });
    }

    spinner.text = 'Generating compact metadata....';
    const compact = await generateCompactMetadata(called, api.metadata);

    const outDir = path.resolve(output);
    const compactFileName = path.join(outDir, `compact.json`);

    fs.writeFileSync(
      compactFileName,
      JSON.stringify({
        metadataHex: u8aToHex(compact),
        metadataKey: api.currentMetadataKey,
      }),
    );

    spinner.succeed(`Generated compact metadata in ${compactFileName} with size ${compact.length} bytes`);
    if (debug === Debug.JSON || debug === Debug.All) {
      const metadataFile = path.join(outDir, `metadata.json`);

      fs.writeFileSync(metadataFile, JSON.stringify(api.metadata));

      console.info(`✔ Generated debug json version in ${metadataFile}`);
    }

    spinner.stop();
    await api.disconnect();
  },
  builder: (yargs) => {
    return yargs
      .option('wsUrl', {
        type: 'string',
        describe: 'Websocket Url to fetch metadata',
        alias: 'w',
        demandOption: true,
      })
      .option('filesPath', {
        type: 'string',
        describe: 'Just dir path',
        alias: 'f',
      })
      .option('output', {
        type: 'string',
        describe: 'Output folder to put generated files',
        alias: 'o',
      })
      .option('debug', {
        type: 'string',
        describe: 'Print out found calls or generate json metadata files',
        alias: 'd',
      });
  },
};

async function lookUpFiles(_path: string): Promise<string[]> {
  const dirOrFile = path.resolve(_path);
  const stat = fs.statSync(dirOrFile);
  const files: string[] = [];

  if (!stat.isFile()) {
    files.push(...(await glob(`${dirOrFile}/**/*.{ts,js}`, { ignore: 'node_modules/**' })));
  } else {
    files.push(dirOrFile);
  }

  return files;
}

function detectingCalls(files: string[]): string[][] {
  const chain: string[][] = [];
  const program = ts.createProgram({ rootNames: files, options: { allowJs: true } });

  files.forEach((filePath) => {
    // From now only support .ts, .js files
    if (!['.ts', '.js'].includes(path.parse(filePath).ext)) return;

    const sourceFile = program.getSourceFile(filePath)!;

    const visitor = (node: ts.Node) => {
      if (ts.isCallExpression(node)) {
        const maybe: string[] = [];

        let _node = node.expression;
        while (ts.isPropertyAccessExpression(_node)) {
          maybe.unshift(_node.name.text);
          _node = _node.expression;
        }

        if (CALL_TYPEs.find((one) => maybe.includes(one))) {
          chain.push(maybe);
        }
      }
      ts.forEachChild(node, visitor);
    };
    ts.forEachChild(sourceFile, visitor);
  });

  return chain;
}

async function generateCompactMetadata(called: string[][], metadata: Metadata): Promise<Uint8Array> {
  // This one depends on which query or tx pallet be called
  const palletsUsed = new Set<string>();
  const palletToEntriesUsed = new Map<string, Set<string>>();
  const palletToTxCallsUsed = new Map<string, Set<string>>();
  const apiToMethodsUsed = new Map<string, Set<string>>();
  const palletToEventsUsed = new Map<string, Set<string>>();
  const palletToConstsUsed = new Map<string, Set<string>>();
  const palletToErrorsUsed = new Map<string, Set<string>>();
  // Just in case ContractsApi being used
  let keepContracts = false;

  called.forEach((chain) => {
    // Maybe ContractsApi being used
    if (chain.length <= 2) {
      palletsUsed.add('contracts');
      keepContracts = true;
    }
    // Maybe pallet calls
    else {
      const callTypeIndex = chain.findIndex((chainEle) => CALL_TYPEs.includes(chainEle as any));

      if (callTypeIndex === -1) {
        // This one is not a pallets call at all
        return;
      }

      const x = chain[callTypeIndex + 1];
      const y = chain[callTypeIndex + 2];

      switch (chain[callTypeIndex] as CallTypes) {
        case CallTypes.Query:
          palletsUsed.add(x);
          return addToMap(palletToEntriesUsed, x, y);
        case CallTypes.Call:
          return addToMap(apiToMethodsUsed, x, y);
        case CallTypes.Extrinsic:
          palletsUsed.add(x);
          return addToMap(palletToTxCallsUsed, x, y);
        case CallTypes.Events:
          palletsUsed.add(x);
          return addToMap(palletToEventsUsed, x, y);
        case CallTypes.Consts:
          palletsUsed.add(x);
          return addToMap(palletToConstsUsed, x, y);
        case CallTypes.Errors:
          palletsUsed.add(x);
          return addToMap(palletToErrorsUsed, x, y);
      }
    }
  });

  if (palletToTxCallsUsed.size > 0 || keepContracts) {
    palletsUsed.add('system');
    palletsUsed.add('timestamp');

    addToMap(palletToConstsUsed, 'system', 'blockHashCount');
    addToMap(palletToConstsUsed, 'timestamp', 'minimumPeriod');

    // Only for babe chain support
    palletsUsed.add('babe');
    addToMap(palletToConstsUsed, 'babe', 'expectedBlockTime');

    // This one is needed when transfer balances
    addToMap(apiToMethodsUsed, 'accountNonceApi', 'accountNonce');

    addToMap(palletToEventsUsed, 'system', 'ExtrinsicSuccess');
    addToMap(palletToEventsUsed, 'system', 'ExtrinsicFailed');
  }

  filterPallets(metadata, palletsUsed);
  filterEntries(metadata, palletToEntriesUsed);
  filterApis(metadata, apiToMethodsUsed, keepContracts);
  filterTx(metadata, palletToTxCallsUsed, keepContracts);
  filterConstant(metadata, palletToConstsUsed);
  filterEvents(metadata, palletToEventsUsed);

  // Re-work this one.
  filterError(metadata, palletToErrorsUsed);

  const typesUsed: Set<number | undefined> = new Set();
  const { pallets, apis, runtimeType, outerEnums, extrinsic } = metadata.latest;

  // Research this type
  typesUsed.add(runtimeType);

  pallets.forEach(({ calls, event, error, storage, constants }) => {
    typesUsed.add(calls);
    typesUsed.add(error);
    typesUsed.add(event);

    storage?.entries.forEach(({ storageType }) => {
      switch (storageType.type) {
        case 'Map':
          typesUsed.add(storageType.value.keyTypeId);
        case 'Plain':
          typesUsed.add(storageType.value.valueTypeId);
      }
    });

    constants.forEach(({ typeId }) => typesUsed.add(typeId));
  });

  apis.forEach(({ methods }) => {
    methods.forEach(({ inputs, output }) => {
      typesUsed.add(output);
      inputs.forEach(({ typeId }) => typesUsed.add(typeId));
    });
  });

  // Maybe just need to include when have tx called
  const { callTypeId, signatureTypeId, signedExtensions, addressTypeId, extraTypeId } = extrinsic;

  if (signedExtensions.length) {
    typesUsed.add(callTypeId);
    typesUsed.add(signatureTypeId);
    typesUsed.add(addressTypeId);
    typesUsed.add(extraTypeId);

    signedExtensions.forEach(({ typeId, additionalSigned }) => {
      typesUsed.add(typeId);
      typesUsed.add(additionalSigned);
    });

    const { errorEnumTypeId, eventEnumTypeId } = outerEnums;

    typesUsed.add(errorEnumTypeId);
    typesUsed.add(eventEnumTypeId);
  }

  typesUsed.forEach((typeId) => {
    if (!typeId) return;

    findDependTypes(typeId, metadata).forEach((one) => typesUsed.add(one));
  });

  filterTypes(metadata, typesUsed);

  return $Metadata.encode(metadata);
}

function filterTypes(metadata: Metadata, typesUsed: Set<number | undefined>) {
  metadata.latest.types = metadata.latest.types
    .filter((type) => typesUsed.has(type.id))
    .map((type) => {
      const { path, typeDef } = type;

      type.docs = [];

      if (checkKnownCodecType(path)[0]) {
        return {
          ...type,
          params: [],
          typeDef: WHITE_TYPE_DEF,
        };
      }

      if (!['Result', 'Option'].includes(type.path.join('::'))) {
        type.path = [];
      }

      switch (typeDef.type) {
        case 'Struct':
          typeDef.value.fields = typeDef.value.fields.map((one) => ({ ...one, docs: [], typeName: undefined }));
          break;
        case 'Enum':
          typeDef.value.members = typeDef.value.members.map((one) => ({
            ...one,
            docs: [],
            fields: one.fields.map((one) => ({ ...one, typeName: undefined, docs: [] })),
          }));
          break;
        case 'SizedVec':
        case 'Tuple':
        case 'Primitive':
        case 'Sequence':
        case 'Compact':
        case 'BitSequence':
      }

      return type;
    });
}

function findDependTypes(typeId: number, metadata: Metadata, type = new Set<number>()): Set<number> {
  const { typeDef } = metadata.latest.types[typeId];

  switch (typeDef.type) {
    case 'Struct':
      typeDef.value.fields.forEach(({ typeId }) => {
        if (type.has(typeId)) return;

        type.add(typeId);
        findDependTypes(typeId, metadata, type).forEach((one) => type.add(one));
      });
      break;
    case 'Enum':
      typeDef.value.members.forEach(({ fields }) =>
        fields.forEach(({ typeId }) => {
          if (type.has(typeId)) return;

          type.add(typeId);
          findDependTypes(typeId, metadata, type).forEach((one) => type.add(one));
        }),
      );
      break;
    case 'Sequence':
    case 'SizedVec':
    case 'Compact':
      if (!type.has(typeDef.value.typeParam)) {
        type.add(typeDef.value.typeParam);
        findDependTypes(typeId, metadata, type).forEach((one) => type.add(one));
      }
      break;
    case 'Tuple':
      if ('fields' in typeDef.value) {
        typeDef.value.fields.forEach((typeId) => {
          if (type.has(typeId)) return;

          type.add(typeId);
          findDependTypes(typeId, metadata, type).forEach((one) => type.add(one));
        });
      }
    case 'BitSequence':
    case 'Primitive':
  }

  return type;
}

function filterPallets(metadata: Metadata, palletsUsed: Set<string>) {
  metadata.latest.pallets = metadata.latest.pallets.filter(({ name }) => palletsUsed.has(stringCamelCase(name)));
}

function filterEntries(metadata: Metadata, entriesUsed: Map<string, Set<string>>) {
  metadata.latest.pallets = metadata.latest.pallets.map((pallet) => {
    if (!pallet.storage) {
      return { ...pallet, docs: [] };
    }

    const entries = pallet.storage.entries
      .filter((entry) => entriesUsed.get(stringCamelCase(pallet.name))?.has(stringCamelCase(entry.name)))
      .map((entry) => ({ ...entry, docs: [] }));

    return {
      ...pallet,
      storage: { ...pallet.storage, entries },
      docs: [],
    };
  });
}

function filterApis(metadata: Metadata, apiToMethodsUsed: Map<string, Set<string>>, keepContracts = false) {
  metadata.latest.apis = metadata.latest.apis
    .filter(({ name }) => (keepContracts && name === 'ContractsApi') || apiToMethodsUsed.has(stringCamelCase(name)))
    .map((api) => {
      if (keepContracts && api.name === 'ContractsApi') {
        return {
          ...api,
          methods: api.methods.map((one) => ({ ...one, docs: [] })),
          docs: [],
        };
      }

      const methods = api.methods
        .filter((method) => apiToMethodsUsed.get(stringCamelCase(api.name))?.has(stringCamelCase(method.name)))
        .map((one) => ({ ...one, docs: [] }));

      return {
        ...api,
        methods,
        docs: [],
      };
    });
}

function filterTx(metadata: Metadata, palletToTxCallsUsed: Map<string, Set<string>>, keepContracts = false) {
  if (!palletToTxCallsUsed.size && !keepContracts) {
    metadata.latest.extrinsic.signedExtensions = [];

    metadata.latest.pallets = metadata.latest.pallets.map((pallet) => {
      return {
        ...pallet,
        calls: 0,
        error: 0,
        event: 0,
      };
    });
  } else {
    const {
      typeDef: { type, value },
    } = metadata.latest.types[metadata.latest.outerEnums.callEnumTypeId];

    const { pallets } = metadata.latest;

    assert(type === 'Enum', 'txCallDef need to be a Enum!');

    value.members = value.members.filter(({ name: palletName }) =>
      pallets.find((one) => stringCamelCase(one.name) === stringCamelCase(palletName)),
    );

    value.members.forEach(({ name: palletName, fields: [{ typeId: palletCallTypeId }] }) => {
      if (keepContracts && palletName === 'Contracts') return;

      const {
        typeDef: { type, value },
      } = metadata.latest.types[palletCallTypeId];

      assert(type === 'Enum', 'txCallDef need to be a Enum!');

      value.members = value.members.filter(({ name: method }) => {
        return palletToTxCallsUsed.get(stringCamelCase(palletName))?.has(stringCamelCase(method));
      });
    });
  }
}

function filterConstant(metadata: Metadata, constsUsed: Map<string, Set<string>>) {
  metadata.latest.pallets = metadata.latest.pallets.map((pallet) => {
    if (!constsUsed.has(stringCamelCase(pallet.name))) {
      return { ...pallet, constants: [] };
    }

    const constants = pallet.constants
      .filter((one) => constsUsed.get(stringCamelCase(pallet.name))?.has(stringCamelCase(one.name)))
      .map((one) => ({ ...one, docs: [] }));

    return {
      ...pallet,
      constants,
    };
  });
}

function filterEvents(metadata: Metadata, eventsUsed: Map<string, Set<string>>, keepContracts = true) {
  const {
    types,
    outerEnums: { eventEnumTypeId },
  } = metadata.latest;

  const {
    typeDef: { type, value },
  } = types[eventEnumTypeId];

  assert(type === 'Enum', 'RuntimeEvent def need to be a Enum type!');

  value.members = value.members.map((pallet, idx) => {
    if (keepContracts && pallet.name === 'Contracts') return pallet;

    pallet.name = eventsUsed.has(stringCamelCase(pallet.name)) ? pallet.name : `${idx}`;
    return pallet;
  });

  const _map = new Map<number, number>();
  const _set = new Set<number>();

  value.members.forEach(({ name: palletName, fields: [{ typeId: palletEventsTypeId }] }) => {
    if (keepContracts && palletName === 'Contracts') return;

    const {
      typeDef: { type, value },
    } = types[palletEventsTypeId];

    assert(type === 'Enum', 'PalletEvents def need to be a Enum type!');

    value.members = value.members.map(({ name, fields, index }, idx) => {
      if (eventsUsed.get(stringCamelCase(palletName))?.has(stringPascalCase(name)))
        return { name, fields, index, docs: [] };

      return {
        name: `${idx}`,
        fields: reduceFieldSize(fields, metadata, _map, _set) as any,
        index,
        docs: [],
      };
    });
  });
}

function filterError(metadata: Metadata, errorsUsed: Map<string, Set<string>>, keepContracts = true) {
  const {
    typeDef: { type, value },
  } = metadata.latest.types[metadata.latest.outerEnums.errorEnumTypeId];

  assert(type === 'Enum', 'errorDef need to be a Enum');

  value.members = value.members.filter(({ name: palletName }) => errorsUsed.has(palletName));

  value.members.forEach(({ name: palletName, fields: [{ typeId: palletErrorsTypeId }] }) => {
    if (keepContracts && palletName === 'Contracts') return;

    const {
      typeDef: { type, value },
    } = metadata.latest.types[palletErrorsTypeId];

    assert(type === 'Enum', 'eventDef need to be a Enum!');

    value.members = value.members.filter(({ name: error }) => errorsUsed.get(palletName)?.has(stringCamelCase(error)));
  });
}
