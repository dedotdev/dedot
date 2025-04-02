import { dedot } from './dedot.js';

export { dedot };

// We run this directly for development purpose via tsx
// @ts-ignore
if (typeof process.env._ === 'string' && process.env._.includes('tsx')) {
  dedot();
}
