import DelightfulApi from './DelightfulApi';
import { hexToString, hexToU8a, isFunction, stringToHex } from '@polkadot/util';
import { IKeyringPair } from '@polkadot/types/types';
import { SignOptions } from '@polkadot/keyring/types';
import { blake2AsU8a, cryptoWaitReady } from '@polkadot/util-crypto';
import { Keyring } from '@polkadot/keyring';
import { AstarApi, KusamaApi, PolkadotApi } from '@delightfuldot/chaintypes';
import { $Metadata, $SignedBlock, CodecRegistry, Extrinsic, TransactionStatus } from '@delightfuldot/codecs';
import * as $ from '@delightfuldot/shape';
import { al, b } from 'vitest/dist/reporters-5f784f42';
import * as fs from 'fs';
import { RococoAssetHubApi, StagingXcmV3MultilocationMultiLocation } from '@delightfuldot/chaintypes/rococoAssetHub';

import { SignedExtension } from './extrinsic';
import { PolkadotAssetHubApi } from '@delightfuldot/chaintypes/polkadotAssetHub';
import { AlephApi } from '@delightfuldot/chaintypes/aleph';
import { KusamaAssetHubApi } from '@delightfuldot/chaintypes/kusamaAssetHub';
import { assert } from '@delightfuldot/utils';

const run = async () => {
  await cryptoWaitReady();
  const keyring = new Keyring({ type: 'sr25519' });
  const alice = keyring.addFromUri('//Alice');
  // console.log(alice.address);
  // const $x = $.Struct({});
  // console.log($x.tryEncode({}));
  // console.log($x.tryEncode(null));
  // console.log($.Tuple().tryEncode([]));
  // const api = await DelightfulApi.new('');
  // const api = await DelightfulApi.new<PolkadotApi>('wss://apps-rpc.polkadot.io');
  const api = await DelightfulApi.new<AstarApi>('wss://rpc.astar.network');
  // const api = await DelightfulApi.new<KusamaApi>('wss://kusama-rpc.polkadot.io');
  // const api = await DelightfulApi.new<AlephApi>('wss://aleph-zero.api.onfinality.io/public-ws');

  // console.log(await api.rpc.chain.getBlock());
  const block = (await api.rpc.chain.getBlock())!;

  // console.log(block);

  // const raw = $SignedBlock.tryEncode(block);
  // console.log(JSON.stringify($SignedBlock.tryDecode(raw)) === JSON.stringify(block));

  // const $Ex = api.registry.findCodec<Extrinsic>('Extrinsic');

  // console.log(api.metadata);

  // const api = await DelightfulApi.new<KusamaAssetHubApi>('wss://kusama-asset-hub-rpc.polkadot.io/');

  // const api = await DelightfulApi.new<KusamaAssetHubApi>({
  //   endpoint: 'wss://rococo-asset-hub-rpc.polkadot.io/',
  // });

  // console.log(await api.call.babeApi.generateKeyOwnershipProof(1n, '5CDCFpLH7mNKcJrH5zAvKZMmCCRnYx9FWxm6kZjgskRhrvSi'));

  // const seed = 'bottom drive obey lake curtain smoke basket hold race lonely fit walk';

  // console.log(await api.call.blockBuilder.inherentExtrinsics({ data: new Map() }));
  // console.log(await api.call.blockBuilder.finalizeBlock());

  // console.log(await api.call.parachainHost.asyncBackingParams());

  // isOptional
  // const x = await api.call.genesisBuilder.createDefaultConfig();
  // console.log(hexToString(x));
  // console.log(await api.call.genesisBuilder.buildConfig(x));
  // console.log(await api.call.beefyApi.validatorSet());

  // fs.writeFileSync('./ksmassethub.json', JSON.stringify(metadata, null, 2));

  // console.dir(api.call.contractsApi.uploadCode, { depth: null });
  // console.log(await api.call.);

  const transferTx = api.tx.balances.transferKeepAlive(
    '5CDCFpLH7mNKcJrH5zAvKZMmCCRnYx9FWxm6kZjgskRhrvSi',
    2_000_000_000_000n,
  );

  await transferTx.sign(alice);

  // api.call.contractsApi.call;

  // console.log(await api.call.sessionKeys.generateSessionKeys());

  console.log('queryInfo', await api.call.transactionPaymentApi.queryInfo(transferTx.toU8a(), transferTx.length));
  //
  console.log(
    'queryCallInfo',
    await api.call.transactionPaymentCallApi.queryCallInfo(transferTx.callHex, transferTx.callLength),
  );

  // console.log(await api.call.transactionPaymentCallApi.queryLengthToFee(transferTx.toU8a().length));
  // console.log(await api.call.transactionPaymentCallApi.queryWeightToFee(fee.weight));

  //
  // const assetId: StagingXcmV3MultilocationMultiLocation = {
  //   parents: 1,
  //   interior: {
  //     tag: 'Here',
  //   },
  // };
  // await transferTx.sign(alice);
  // // //
  // console.dir(transferTx.toJSON(), { depth: null });
  // console.dir(transferTx.toHex(), { depth: null });

  // const balances = await api.query.system.account(alice.address);
  // console.log(balances);

  // fs.writeFileSync('./polkadotassethub.json', JSON.stringify(api.metadata, null, 2));

  // const result = await api.rpc.chainHead.unstableFollow(true, (event) => {
  //   if (event.event === 'initialized') {
  //     console.log(event);
  //   }
  // });
  // console.log(result);
  // const api = await DelightfulApi.new('wss://rpc.astar.network');
  // const $Tx = api.registry.findCodec('Extrinsic') as $.Shape<Extrinsic>;
  // const txs = (await api.rpc.chain.getBlock())!.block.extrinsics;
  // txs.forEach((tx) => {
  //   console.dir($Tx.tryDecode(tx).toJSON(), { depth: null });
  // });
  // const bob = '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty';
  // const c = '5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y';
  // //100_000_000_000_000_000_000_000n
  // // 100_000_000_000_000n
  // const tx = api.tx.balances.transferAll(bob, false);
  // console.log(tx.toHex());
  //
  // await tx.sign(alice);
  //
  // console.log(tx.toHex());
  // const dryRunResult = await tx.dryRun(alice);

  // console.log('dryRunResult', dryRunResult);

  // if (dryRunResult.isOk && dryRunResult.value.isOk) {
  //   await tx.signAndSend(alice, (result) => {
  //     console.log(result);
  //
  //     if (result.dispatchError) {
  //       if (api.errors.balances.InsufficientBalance.is(result.dispatchError)) {
  //         console.log(api.registry.findErrorMeta(result.dispatchError));
  //       } else {
  //         console.log('Error', result.dispatchError);
  //       }
  //     } else if (result.dispatchInfo) {
  //       console.log('result.dispatchInfo', result.dispatchInfo);
  //     }
  //   });
  // }

  // const batchTx = api.tx.balances.transferKeepAlive(bob, 100_000_000_000_000n);
  // await tx.signAsync(alice);
  // console.log(tx.signature);

  // const tx = api.tx.balances.transferKeepAlive(bob, 1_000_000_000_000_000_000_000_000n);
  // console.log(await tx.dryRun(alice));
  // const tx2 = api.tx.balances.transferKeepAlive(c, 10_000_000_000_000_000n);
  // const remarkTx = api.tx.system.remarkWithEvent('0x10101010');
  // const batchTx = api.tx.utility.batch([tx.call, tx2.call, remarkTx.call]);
  //
  // await batchTx.signAndSend(alice, { tip: 100_000n }, (result) => {
  //   console.dir(result, { depth: null });
  // });

  // console.log(batchTx.toHex());
  // console.dir(batchTx.toJSON(), { depth: null });

  // await batchTx.signAsync(alice);

  // const { callTypeId } = api.registry.metadata!.extrinsic;
  // const $RuntimeCall = api.registry.findPortableCodec(callTypeId);

  // console.dir(batchTx.call, { depth: null });
  // console.dir(batchTx.rawCall, { depth: null });
  // console.dir($RuntimeCall.tryDecode(batchTx.rawCall), { depth: null });
  // @ts-ignore
  // console.log(batchTx.toHex());
  // console.dir(tx.call, { depth: null });
  // console.dir(batchTx.call, { depth: null });

  // const tx = $Tx.tryDecode(rawTx.toHex()) as Extrinsic;
  // console.dir(tx.toJSON(), { depth: null });
  // await api.rpc.author.submitAndWatchExtrinsic(rawExt, (status) => {
  //   console.log(status);
  // });
  // console.log(await api.rpc.system.accountNextIndex('15zTMo4VhEni5pgHtmYGTHJP7feM6fkJfJ2q2vZq5omP28s8'));
  // console.log(await api.query.system.account('15zTMo4VhEni5pgHtmYGTHJP7feM6fkJfJ2q2vZq5omP28s8'));
  // // // console.dir(await api.rpc.chain.getFinalizedHead(), { depth: null });
  // console.dir(await extra.getData(), { depth: null });
  // console.dir(await extra.getAdditionalSigned(), { depth: null });
  // console.log(extra.dataCodec.tryEncode(await extra.getData()));
  // console.log(extra.additionalSignedCodec.tryEncode(await extra.getAdditionalSigned()));
  // const { callTypeId, addressTypeId, signatureTypeId, extraTypeId } = api.metadataLatest.extrinsic;
  // TODO ex version
  // const $addressCodec = api.registry.findPortableCodec(addressTypeId);
  // const $signatureCodec = api.registry.findPortableCodec(signatureTypeId);
  // const $extraCodec = api.registry.findPortableCodec(extraTypeId);
  //
  // const extraType = api.registry.findPortableType(extraTypeId);
  // console.dir(extraType, { depth: null });
  // console.log(api.metadataLatest.extrinsic.signedExtensions);
  // Signature = signer.sign(payload = [Call, Extra, Extra.AdditionalSigned])
  // Tx = Version, Address, Signature, Extra, Call
  // api.tx.balances.transfer('5DUoTNGfoNmWSJNo1LfmqPPhUQpYBNhqGCF52dLjD6K3k5mC', 123123n);
  // api.tx.balances.transfer({ tag: 'Id', value: '5DUoTNGfoNmWSJNo1LfmqPPhUQpYBNhqGCF52dLjD6K3k5mC' }, 123123n);
  // console.log($BlockNumber);
  // const result = await api.rpc.chain.subscribeNewHeads((x) => {
  //   console.log(x);
  // });
  // console.log(api.metadataLatest);
  // api.tx.balances.transfer({ tag: 'Id', value: '123123' }, BigInt(123));
  // console.log(JSON.stringify($Metadata.tryDecode(result).latest.custom));
  // const a = new Map<string, number>();
  // a.set('hello', 1);
  //
  // console.log(a);
  // fs.writeFileSync('./polkadotv15.json', JSON.stringify($Metadata.tryDecode(result), null, 2));
};

run().catch(console.error);
