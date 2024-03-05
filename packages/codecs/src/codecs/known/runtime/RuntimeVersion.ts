import * as $ from '@dedot/shape';
import { $Text } from '../common';

export const $ApiId = $.FixedHex(8);

/**
 * A vector of pairs of `ApiId` and a `u32` for version.
 */
export const $ApisVec = $.Vec($.Tuple($ApiId, $.u32));

/**
 * Runtime version.
 * This should not be thought of as classic Semver (major/minor/tiny).
 * This triplet have different semantics and mis-interpretation could cause problems.
 *
 * In particular: bug fixes should result in an increment of `spec_version` and possibly
 * `authoring_version`, absolutely not `impl_version` since they change the semantics of the
 * runtime.
 *
 * Ref: https://github.com/paritytech/polkadot-sdk/blob/0e49ed72aa365475e30069a5c30e251a009fdacf/substrate/primitives/version/src/lib.rs#L152-L215
 */
export const $RuntimeVersion = $.Struct({
  // Identifies the different Substrate runtimes. There'll be at least polkadot and node.
  // A different on-chain spec_name to that of the native runtime would normally result
  // in node not attempting to sync or author blocks.
  specName: $Text,

  // Name of the implementation of the spec. This is of little consequence for the node
  // and serves only to differentiate code of different implementation teams. For this
  // codebase, it will be parity-polkadot. If there were a non-Rust implementation of the
  // Polkadot runtime (e.g. C++), then it would identify itself with an accordingly different
  // `impl_name`.
  implName: $Text,

  // `authoring_version` is the version of the authorship interface. An authoring node
  // will not attempt to author blocks unless this is equal to its native runtime.
  authoringVersion: $.u32,

  // Version of the runtime specification.
  //
  // A full-node will not attempt to use its native runtime in substitute for the on-chain
  // Wasm runtime unless all of `spec_name`, `spec_version` and `authoring_version` are the same
  // between Wasm and native.
  //
  // This number should never decrease.
  specVersion: $.u32,

  // Version of the implementation of the specification.
  //
  // Nodes are free to ignore this; it serves only as an indication that the code is different;
  // as long as the other two versions are the same then while the actual code may be different,
  // it is nonetheless required to do the same thing. Non-consensus-breaking optimizations are
  // about the only changes that could be made which would result in only the `impl_version`
  // changing.
  //
  // This number can be reverted to `0` after a [`spec_version`](Self::spec_version) bump.
  implVersion: $.u32,

  // List of supported API "features" along with their versions.
  apis: $ApisVec,

  // All existing calls (dispatchables) are fully compatible when this number doesn't change. If
  // this number changes, then [`spec_version`](Self::spec_version) must change, also.
  //
  // This number must change when an existing call (pallet index, call index) is changed,
  // either through an alteration in its user-level semantics, a parameter
  // added/removed, a parameter type changed, or a call/pallet changing its index. An alteration
  // of the user level semantics is for example when the call was before `transfer` and now is
  // `transfer_all`, the semantics of the call changed completely.
  //
  // Removing a pallet or a call doesn't require a *bump* as long as no pallet or call is put at
  // the same index. Removing doesn't require a bump as the chain will reject a transaction
  // referencing this removed call/pallet while decoding and thus, the user isn't at risk to
  // execute any unknown call. FRAME runtime devs have control over the index of a call/pallet
  // to prevent that an index gets reused.
  //
  // Adding a new pallet or call also doesn't require a *bump* as long as they also don't reuse
  // any previously used index.
  //
  // This number should never decrease.
  transactionVersion: $.u32,

  // Version of the state implementation used by this runtime.
  // Use of an incorrect version is consensus breaking.
  stateVersion: $.u8,
});

export type RuntimeVersion = $.Input<typeof $RuntimeVersion>;
