import {parseRawMetadata} from "../utils.js";
// @ts-ignore
import flipperV6Raw from './flipper_v6.json' assert {type: 'json'};

export const INK_FLIPPER_CONTRACT_METADATA_V6 = parseRawMetadata(JSON.stringify(flipperV6Raw));
