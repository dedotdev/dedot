import * as $ from '@dedot/shape';

/**
 * An identifier for an inherent.
 */
export const $InherentIdentifier = $.FixedHex(8);

export const $InherentData = $.Struct({
  data: $.map($InherentIdentifier, $.PrefixedHex),
});

export type InherentData = $.Input<typeof $InherentData>;

/**
 *
 * The result of checking inherents.
 *
 * It either returns okay for all checks, stores all occurred errors or just one fatal error.
 *
 * When a fatal error occurs, all other errors are removed and the implementation needs to
 * abort checking inherents.
 */
export const $CheckInherentsResult = $.Struct({
  // Did the check succeed?
  okay: $.bool,
  // Did we encounter a fatal error?
  fatalError: $.bool,
  // We use the `InherentData` to store our errors.
  errors: $InherentData,
});

export type CheckInherentsResult = $.Input<typeof $CheckInherentsResult>;
