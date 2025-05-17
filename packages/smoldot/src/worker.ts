// Source Code: https://smol-dot.github.io/smoldot/doc-javascript/#md:usage-with-a-worker
import { compileBytecode } from 'smoldot/bytecode';
import * as smoldot from 'smoldot/worker';

compileBytecode().then((bytecode) => postMessage(bytecode));
onmessage = (msg) => smoldot.run(msg.data);
