// @ts-ignore
import flipperV4Raw from './flipper_v4.json' assert {type: 'json'};
// @ts-ignore
import flipperV5Raw from './flipper_v5.json' assert {type: 'json'};
// @ts-ignore
import flipperV6Raw from './flipper_v6.json' assert {type: 'json'};
// @ts-ignore
import flipperV5NoSignatureTopicRaw from './flipper_v5_no_signature_topic.json' assert {type: 'json'};
// @ts-ignore
import flipperV5NoSignatureTopicIndexedFieldsRaw from './flipper_v5_no_signature_topic_indexed_fields.json' assert {type: 'json'};
// @ts-ignore
import psp22Raw from './psp22.json' assert {type: 'json'};
import { flipperSol } from './flipper_sol.js';

export const RANDOM_CONTRACT_ADDRESS = '5GpTe4rrVUcZbndCc6HGNCLNfs84R9xaQ9FhPYXQFUZqMVZn';

export const FLIPPER_CONTRACT_METADATA_V4 = flipperV4Raw;
export const FLIPPER_CONTRACT_METADATA_V5 = flipperV5Raw;
export const FLIPPER_CONTRACT_METADATA_V6 = flipperV6Raw;
export const PSP22_CONTRACT_METADATA = psp22Raw;
export const FLIPPER_CONTRACT_METADATA_V5_NO_SIGNATURE_TOPIC = flipperV5NoSignatureTopicRaw;
export const FLIPPER_CONTRACT_METADATA_V5_NO_SIGNATURE_TOPIC_INDEXED_FIELDS = flipperV5NoSignatureTopicIndexedFieldsRaw;

// Sol contract metadata and constants
const [FLIPPER_SOL_CODE, FLIPPER_SOL_ABI_STRING] = flipperSol();
export const FLIPPER_SOL_ABI = JSON.parse(FLIPPER_SOL_ABI_STRING);
export const FLIPPER_SOL_CONTRACT_CODE = FLIPPER_SOL_CODE;
export const FLIPPER_SOL_CONTRACT_ADDRESS = '0xbd94eb5fdc31ef0e54dca45284fe779165ecaaed';
