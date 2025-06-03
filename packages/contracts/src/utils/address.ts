import { AccountId20, AccountId20Like, AccountId32, AccountId32Like, BytesLike } from '@dedot/codecs';
import { concatU8a, HexString, hexToU8a, keccakAsU8a, toHex, toU8a, u8aToHex } from '@dedot/utils';
import { RLP } from '@ethereumjs/rlp';

// https://github.com/paritytech/polkadot-sdk/blob/5405e473854b139f1d0735550d90687eaf1a13f9/substrate/frame/revive/src/address.rs#L197-L204
export function create1(deployer: AccountId20Like, nonce: number): HexString {
  const encodedData = RLP.encode([new AccountId20(deployer).raw, toHex(nonce)]);
  const hash = keccakAsU8a(encodedData);

  return u8aToHex(hash.subarray(12));
}

// https://github.com/paritytech/polkadot-sdk/blob/5405e473854b139f1d0735550d90687eaf1a13f9/substrate/frame/revive/src/address.rs#L206-L219
export function create2(deployer: AccountId20Like, code: BytesLike, inputData: BytesLike, salt: BytesLike): HexString {
  const initCodeHash = keccakAsU8a(concatU8a(toU8a(code), toU8a(inputData)));

  const bytes = new Uint8Array(1 + (20 + 32 + 32)); // 0xff + deployer + salt + initCodeHash
  bytes[0] = 0xff;
  bytes.set(hexToU8a(new AccountId20(deployer).raw), 1);
  bytes.set(toU8a(salt), 21);
  bytes.set(initCodeHash, 53);

  const hash = keccakAsU8a(bytes);

  return u8aToHex(hash.subarray(12));
}

function isEthDerived(accountId: Uint8Array): boolean {
  if (accountId.length >= 32) {
    return accountId.slice(20, accountId.length).every((byte) => byte === 0xee);
  }

  return false;
}

// https://github.com/paritytech/polkadot-sdk/blob/5405e473854b139f1d0735550d90687eaf1a13f9/substrate/frame/revive/src/address.rs#L101-L113
export function toEthAddress(accountId: AccountId32Like): HexString {
  const accountBytes = hexToU8a(new AccountId32(accountId).raw);

  const accountBuffer = new Uint8Array(32);
  accountBuffer.set(accountBytes.slice(0, 32));

  if (isEthDerived(accountBytes)) {
    // This was originally an eth address
    // We just strip the 0xEE suffix to get the original address
    return ('0x' + Buffer.from(accountBuffer.slice(0, 20)).toString('hex')) as HexString;
  } else {
    const accountHash = keccakAsU8a(accountBuffer);
    return u8aToHex(accountHash.subarray(12));
  }
}
