import * as $ from '@dedot/shape';

export const $Phase = $.Enum({
  ApplyExtrinsic: $.u32,
  Finalization: null,
  Initialization: null,
});

export type Phase = $.Output<typeof $Phase>;
