import type { Chain } from 'smoldot';
import { SubscriptionProvider } from '../base/index.js';

/**
 * @name SmoldotProvider
 */
export class SmoldotProvider extends SubscriptionProvider {
  constructor(chain: Chain) {
    super();
  }
}
