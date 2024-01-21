import * as $ from '@delightfuldot/shape';

/**
 * An identifier of a pluralistic body.
 */
export const $BodyId = $.Enum({
  /// The only body in its context.
  Unit: null,
  /// A named body.
  Moniker: $.FixedHex(4),
  /// An indexed body.
  Index: $.compactU32,
  /// The unambiguous executive body (for Polkadot, this would be the Polkadot council).
  Executive: null,
  /// The unambiguous technical body (for Polkadot, this would be the Technical Committee).
  Technical: null,
  /// The unambiguous legislative body (for Polkadot, this could be considered the opinion of a
  /// majority of lock-voters).
  Legislative: null,
  /// The unambiguous judicial body (this doesn't exist on Polkadot, but if it were to get a
  /// "grand oracle", it may be considered as that).
  Judicial: null,
  /// The unambiguous defense body (for Polkadot, an opinion on the topic given via a public
  /// referendum on the `staking_admin` track).
  Defense: null,
  /// The unambiguous administration body (for Polkadot, an opinion on the topic given via a
  /// public referendum on the `general_admin` track).
  Administration: null,
  /// The unambiguous treasury body (for Polkadot, an opinion on the topic given via a public
  /// referendum on the `treasurer` track).
  Treasury: null,
});

/**
 * A part of a pluralistic body.
 */
export const $BodyPart = $.Enum({
  /// The body's declaration, under whatever means it decides.
  Voice: null,
  /// A given number of members of the body.
  Members: $.Struct({
    count: $.compactU32,
  }),
  /// A given number of members of the body, out of some larger caucus.
  Fraction: $.Struct({
    nom: $.compactU32,
    denom: $.compactU32,
  }),
  /// No less than the given proportion of members of the body.
  AtLeastProportion: $.Struct({
    nom: $.compactU32,
    denom: $.compactU32,
  }),
  /// More than than the given proportion of members of the body.
  MoreThanProportion: $.Struct({
    nom: $.compactU32,
    denom: $.compactU32,
  }),
});

/**
 * A global identifier of a data structure existing within consensus.
 *
 * Maintenance note: Networks with global consensus and which are practically bridgeable within the
 * Polkadot ecosystem are given preference over explicit naming in this enumeration.
 */
export const $NetworkId = $.Enum({
  /// Network specified by the first 32 bytes of its genesis block.
  ByGenesis: $.FixedHex(32),
  /// Network defined by the first 32-bytes of the hash and number of some block it contains.
  ByFork: $.Struct({ blockNumber: $.u64, blockHash: $.FixedHex(32) }),
  /// The Polkadot mainnet Relay-chain.
  Polkadot: null,
  /// The Kusama canary-net Relay-chain.
  Kusama: null,
  /// The Westend testnet Relay-chain.
  Westend: null,
  /// The Rococo testnet Relay-chain.
  Rococo: null,
  /// The Wococo testnet Relay-chain.
  Wococo: null,
  /// An Ethereum network specified by its chain ID.
  Ethereum: $.Struct({ chainId: $.compactU64 }),
  /// The Bitcoin network, including hard-forks supported by Bitcoin Core development team.
  BitcoinCore: null,
  /// The Bitcoin network, including hard-forks supported by Bitcoin Cash developers.
  BitcoinCash: null,
  /// The Polkadot Bulletin chain.
  PolkadotBulletin: null,
});

/**
 * A single item in a path to describe the relative location of a consensus system.
 *
 * Each item assumes a pre-existing location as its context and is defined in terms of it.
 */
export const $Junction = $.Enum({
  /// An indexed parachain belonging to and operated by the context.
  ///
  /// Generally used when the context is a Polkadot Relay-chain.
  Parachain: $.compactU32,
  /// A 32-byte identifier for an account of a specific network that is respected as a sovereign
  /// endpoint within the context.
  ///
  /// Generally used when the context is a Substrate-based chain.
  AccountId32: $.Struct({ network: $.Option($NetworkId), id: $.FixedHex(32) }),
  /// An 8-byte index for an account of a specific network that is respected as a sovereign
  /// endpoint within the context.
  ///
  /// May be used when the context is a Frame-based chain and includes e.g. an indices pallet.
  AccountIndex64: $.Struct({ network: $.Option($NetworkId), index: $.compactU64 }),
  /// A 20-byte identifier for an account of a specific network that is respected as a sovereign
  /// endpoint within the context.
  ///
  /// May be used when the context is an Ethereum or Bitcoin chain or smart-contract.
  AccountKey20: $.Struct({ network: $.Option($NetworkId), key: $.FixedHex(20) }),
  /// An instanced, indexed pallet that forms a constituent part of the context.
  ///
  /// Generally used when the context is a Frame-based chain.
  // TODO XCMv4 inner should be `Compact<u32>`.
  PalletInstance: $.u8,
  /// A non-descript index within the context location.
  ///
  /// Usage will vary widely owing to its generality.
  ///
  /// NOTE: Try to avoid using this and instead use a more specific item.
  GeneralIndex: $.compactU128,
  /// A nondescript array datum, 32 bytes, acting as a key within the context
  /// location.
  ///
  /// Usage will vary widely owing to its generality.
  ///
  GeneralKey: $.Struct({ length: $.u8, data: $.FixedHex(32) }),
  /// The unambiguous child.
  ///
  /// Not currently used except as a fallback when deriving context.
  OnlyChild: null,
  /// A pluralistic body existing within consensus.
  ///
  /// Typical to be used to represent a governance origin of a chain, but could in principle be
  /// used to represent things such as multisigs also.
  Plurality: $.Struct({ id: $BodyId, part: $BodyPart }),
  /// A global network capable of externalizing its own consensus. This is not generally
  /// meaningful outside of the universal level.
  GlobalConsensus: $NetworkId,
});

/**
 * Non-parent junctions that can be constructed, up to the length of 8. This specific `Junctions`
 * implementation uses a Rust `enum` in order to make pattern matching easier.
 *
 * Parent junctions cannot be constructed with this type. Refer to `Location` for
 * instructions on constructing parent junctions
 */
export const $Junctions = $.Enum({
  /// The interpreting consensus system.
  Here: null,
  /// A relative path comprising 1 junction.
  X1: $.sizedArray($Junction, 1),
  /// A relative path comprising 2 junctions.
  X2: $.sizedArray($Junction, 2),
  /// A relative path comprising 3 junctions.
  X3: $.sizedArray($Junction, 3),
  /// A relative path comprising 4 junctions.
  X4: $.sizedArray($Junction, 4),
  /// A relative path comprising 5 junctions.
  X5: $.sizedArray($Junction, 5),
  /// A relative path comprising 6 junctions.
  X6: $.sizedArray($Junction, 6),
  /// A relative path comprising 7 junctions.
  X7: $.sizedArray($Junction, 7),
  /// A relative path comprising 8 junctions.
  X8: $.sizedArray($Junction, 8),
});

/**
 * A relative path between state-bearing consensus systems.
 *
 * A location in a consensus system is defined as an *isolatable state machine* held within global
 * consensus. The location in question need not have a sophisticated consensus algorithm of its
 * own; a single account within Ethereum, for example, could be considered a location.
 *
 * A very-much non-exhaustive list of types of location include:
 * - A (normal, layer-1) block chain, e.g. the Bitcoin mainnet or a parachain.
 * - A layer-0 super-chain, e.g. the Polkadot Relay chain.
 * - A layer-2 smart contract, e.g. an ERC-20 on Ethereum.
 * - A logical functional component of a chain, e.g. a single instance of a pallet on a Frame-based
 *   Substrate chain.
 * - An account.
 *
 * A `Location` is a *relative identifier*, meaning that it can only be used to define the
 * relative path between two locations, and cannot generally be used to refer to a location
 * universally. It is comprised of an integer number of parents specifying the number of times to
 * "escape" upwards into the containing consensus system and then a number of *junctions*, each
 * diving down and specifying some interior portion of state (which may be considered a
 * "sub-consensus" system).
 *
 * This specific `Location` implementation uses a `Junctions` datatype which is a Rust `enum`
 * in order to make pattern matching easier. There are occasions where it is important to ensure
 * that a value is strictly an interior location, in those cases, `Junctions` may be used.
 *
 * The `Location` value of `Null` simply refers to the interpreting consensus system.
 *
 * Ref: https://github.com/paritytech/polkadot-sdk/blob/8428f678fe5179399f6854e194f1c8b30a9102f9/polkadot/xcm/src/v4/location.rs#L68-L73
 */
export const $Location = $.Struct({
  /// The number of parent junctions at the beginning of this `Location`.
  parents: $.u8,
  /// The interior (i.e. non-parent) junctions that this `Location` contains.
  interior: $Junctions,
});

export type Location = $.Input<typeof $Location>;
