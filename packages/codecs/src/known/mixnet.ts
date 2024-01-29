import * as $ from '@delightfuldot/shape';

/**
 * Absolute session index.
 */
export const $MixnetSessionIndex = $.u32;

export type MixnetSessionIndex = $.Input<typeof $MixnetSessionIndex>;

/**
 * Each session should progress through these phases in order.
 */
export const $SessionPhase = $.FlatEnum([
  /// Generate cover traffic to the current session's mixnode set.
  'CoverToCurrent',
  /// Build requests using the current session's mixnode set.
  'RequestsToCurrent',
  /// Only send cover (and forwarded) traffic to the previous session's mixnode set.
  'CoverToPrev',
  /// Disconnect the previous session's mixnode set.
  'DisconnectFromPrev',
]);

export type SessionPhase = $.Input<typeof $SessionPhase>;

/**
 * The index and phase of the current session.
 */
export const $SessionStatus = $.Struct({
  /// Index of the current session.
  currentIndex: $MixnetSessionIndex,
  /// Current session phase.
  phase: $SessionPhase,
});

export type SessionStatus = $.Input<typeof $SessionStatus>;

/**
 * X25519 public key, used in key exchange between message senders and mixnodes. Mixnode public
 * keys are published on-chain and change every session. Message senders generate a new key for
 * every message they send.
 */
export const $KxPublic = $.FixedHex(32);

export type KxPublic = $.Input<typeof $KxPublic>;

/**
 * Ed25519 public key of a libp2p peer.
 */
export const $PeerId = $.FixedHex(32);

export type PeerId = $.Input<typeof $PeerId>;

/**
 * Information published on-chain for each mixnode every session.
 */
export const $Mixnode = $.Struct({
  /// Key-exchange public key for the mixnode.
  kxPublic: $KxPublic,
  /// libp2p peer ID of the mixnode.
  peerId: $PeerId,
  /// External addresses for the mixnode, in multiaddr format, UTF-8 encoded.
  externalAddresses: $.Vec($.Vec($.u8)),
});

export type Mixnode = $.Input<typeof $Mixnode>;

/**
 * Error querying the runtime for a session's mixnode set.
 */
export const $MixnodesErr = $.Enum({
  /// Insufficient mixnodes were registered for the session.
  InsufficientRegistrations: $.Struct({
    /// The number of mixnodes that were registered for the session.
    num: $.u32,
    /// The minimum number of mixnodes that must be registered for the mixnet to operate.
    min: $.u32,
  }),
});

export type MixnodesErr = $.Input<typeof $MixnodesErr>;
