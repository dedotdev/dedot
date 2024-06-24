import { parseRawMetadata } from "../utils.js";
// @ts-ignore
import flipperV4Raw from './flipper_v4.json' assert { type: 'json' };
// @ts-ignore
import flipperV5Raw from './flipper_v5.json' assert { type: 'json' };
// @ts-ignore
import psp22Raw from './psp22.json' assert { type: 'json' };

export const RANDOM_CONTRACT_ADDRESS = '5GpTe4rrVUcZbndCc6HGNCLNfs84R9xaQ9FhPYXQFUZqMVZn';

export const FLIPPER_CONTRACT_METADATA_V4 = parseRawMetadata(JSON.stringify(flipperV4Raw));
export const FLIPPER_CONTRACT_METADATA_V5 = parseRawMetadata(JSON.stringify(flipperV5Raw));
export const PSP22_CONTRACT_METADATA = parseRawMetadata(JSON.stringify(psp22Raw))
