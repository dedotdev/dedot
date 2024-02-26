import * as $ from '@dedot/shape';
import { $DispatchClass, $Weight } from '../payment';

export const $Pays = $.FlatEnum(['Yes', 'No']);
export type Pays = $.Output<typeof $Pays>;

export const $DispatchInfo = $.Struct({
  weight: $Weight,
  class: $DispatchClass,
  paysFee: $Pays,
});
export type DispatchInfo = $.Output<typeof $DispatchInfo>;
