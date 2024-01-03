import { registry } from './registry';

/*
 * Holds information about the `slot`'s that can be claimed by a given key.
 */
export interface EpochAuthorship {
  // The array of primary slots that can be claimed
  primary: number[];
  // The array of secondary slots that can be claimed
  secondary: number[];
  // The array of secondary VRF slots that can be claimed.
  secondary_vrf: number[];
}

registry.add('EpochAuthorship');
