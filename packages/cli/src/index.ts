import { dedot } from './dedot.js';

export { dedot };

// We run this directly for development purpose via ts-node
// @ts-ignore
if (process[Symbol.for('ts-node.register.instance')]) {
  dedot();
}
