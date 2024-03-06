import * as $ from '@dedot/shape';

export const $InvalidTransaction = $.Enum({
  /// The call of the transaction is not expected.
  Call: null,
  /// General error to do with the inability to pay some fees (e.g. account balance too low).
  Payment: null,
  /// General error to do with the transaction not yet being valid (e.g. nonce too high).
  Future: null,
  /// General error to do with the transaction being outdated (e.g. nonce too low).
  Stale: null,
  /// General error to do with the transaction's proofs (e.g. signature).
  ///
  /// # Possible causes
  ///
  /// When using a signed extension that provides additional data for signing, it is required
  /// that the signing and the verifying side use the same additional data. Additional
  /// data will only be used to generate the signature, but will not be part of the transaction
  /// itself. As the verifying side does not know which additional data was used while signing
  /// it will only be able to assume a bad signature and cannot express a more meaningful error.
  BadProof: null,
  /// The transaction birth block is ancient.
  ///
  /// # Possible causes
  ///
  /// For `FRAME`-based runtimes this would be caused by `current block number
  /// - Era::birth block number > BlockHashCount`. (e.g. in Polkadot `BlockHashCount` = 2400, so
  ///   a
  /// transaction with birth block number 1337 would be valid up until block number 1337 + 2400,
  /// after which point the transaction would be considered to have an ancient birth block.)
  AncientBirthBlock: null,
  /// The transaction would exhaust the resources of current block.
  ///
  /// The transaction might be valid, but there are not enough resources
  /// left in the current block.
  ExhaustsResources: null,
  /// Any other custom invalid validity that is not covered by this enum.
  Custom: $.u8,
  /// An extrinsic with a Mandatory dispatch resulted in Error. This is indicative of either a
  /// malicious validator or a buggy `provide_inherent`. In any case, it can result in
  /// dangerously overweight blocks and therefore if found, invalidates the block.
  BadMandatory: null,
  /// An extrinsic with a mandatory dispatch tried to be validated.
  /// This is invalid; only inherent extrinsics are allowed to have mandatory dispatches.
  MandatoryValidation: null,
  /// The sending address is disabled or known to be invalid.
  BadSigner: null,
});

export const $UnknownTransaction = $.Enum({
  /// Could not lookup some information that is required to validate the transaction.
  CannotLookup: null,
  /// No validator found for the given unsigned transaction.
  NoUnsignedValidator: null,
  /// Any other custom unknown validity that is not covered by this enum.
  Custom: $.u8,
});

export const $TransactionValidityError = $.Enum({
  /// The transaction is invalid.
  Invalid: $InvalidTransaction,
  /// Transaction validity can't be determined.
  Unknown: $UnknownTransaction,
});
