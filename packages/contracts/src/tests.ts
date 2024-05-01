// @ts-ignore
import rawMotherSpace from './metadata/o.json' assert { type: 'json' };
import {waitReady} from '@polkadot/wasm-crypto';
import {ContractMetadata} from "@dedot/types";
import {generateContractTypesFromMetadata} from "@dedot/codegen";

(async () => {
  await waitReady()

  await generateContractTypesFromMetadata(JSON.stringify(rawMotherSpace))
})();
