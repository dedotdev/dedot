import { parseRawMetadata } from "../utils.js";
// @ts-ignore
import flipperRaw from './flipper.json' assert { type: 'json' };
// @ts-ignore
import psp22Raw from './psp22.json' assert { type: 'json' };


export const RANDOM_CONTRACT_ADDRESS = '5GpTe4rrVUcZbndCc6HGNCLNfs84R9xaQ9FhPYXQFUZqMVZn';

export const FLIPPER_CONTRACT_METADATA = parseRawMetadata(JSON.stringify(flipperRaw));
export const PSP22_CONTRACT_METADATA = parseRawMetadata(JSON.stringify(psp22Raw))
