import Keyring from '@polkadot/keyring';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import { DedotClient, ISubstrateClient, LegacyClient, WsProvider } from 'dedot';
import { SubstrateApi } from 'dedot/chaintypes';
import {
  Contract,
  ContractDeployer,
  ContractMetadata,
  create2,
  isContractInstantiateDispatchError,
  isContractInstantiateError,
  parseRawMetadata,
  toEthAddress,
} from 'dedot/revive';
import { RpcVersion } from 'dedot/types';
import { assert, HexString, stringToHex } from 'dedot/utils';
// @ts-ignore
import * as flipperV6Raw from './../../flipper_v6.json';
import { FlipperContractApi } from './flipper';

export const run = async (_nodeName: any, networkInfo: any) => {
  await cryptoWaitReady();

  const alicePair = new Keyring({ type: 'sr25519' }).addFromUri('//Alice');
  const { wsUri } = networkInfo.nodesByName['collator-1'];

  const caller = alicePair.address;
  const flipperV6 = parseRawMetadata(JSON.stringify(flipperV6Raw));

  const verifyContracts = async (api: ISubstrateClient<SubstrateApi[RpcVersion]>, flipper: ContractMetadata) => {
    const binary = flipper.source.contract_binary!;
    const deployer = new ContractDeployer<FlipperContractApi>(api, flipper, binary);

    // Avoid to use same salt with previous tests.
    const timestamp = await api.query.timestamp.now();
    const salt = stringToHex(`${api.rpcVersion}_${timestamp}`.padEnd(32, '0'));

    const blank = '0x0000000000000000000000000000000000000000000000000000000000000000';

    const { data } = await deployer.query.fromSeed(blank, { caller });
    assert(data.isErr && data.err === 'ZeroSum', 'Should get ZeroSum error here');

    const contractAddress = await deployFlipper(api, flipper, salt);
    const contract = new Contract<FlipperContractApi>(api, flipper, contractAddress);

    const { data: info, flags } = await contract.query.flipWithSeed(blank, { caller });
    assert(info.isErr && info.err === 'ZeroSum', 'Should get ZeroSum error here');
    assert(flags.bits === 1 && flags.revert === true, 'Should get Revert flag here');

    // If re-create a contract with same salt, should be throwing DispatchError
    try {
      await deployer.query.newDefault({ caller, salt });

      throw new Error('Expected to throw error!');
    } catch (e: any) {
      assert(isContractInstantiateError(e), 'Should throw ContractInstantiateError!');
      assert(isContractInstantiateDispatchError(e), 'Should throw ContractInstantiateDispatchError!');

      console.log('DispatchError', e.dispatchError);
    }

    // TODO: Add another tests for others errors
  };

  console.log('Checking via legacy API');
  const apiLegacy = await LegacyClient.new(new WsProvider(wsUri));
  await verifyContracts(apiLegacy, flipperV6);

  console.log('Checking via new API');
  const apiV2 = await DedotClient.new(new WsProvider(wsUri));
  await verifyContracts(apiV2, flipperV6);
};

const deployFlipper = async (
  api: ISubstrateClient<SubstrateApi[RpcVersion]>,
  flipper: ContractMetadata,
  salt: HexString,
): Promise<HexString> => {
  const alicePair = new Keyring({ type: 'sr25519' }).addFromUri('//Alice');
  const caller = alicePair.address;

  const binary = flipper.source.contract_binary!;
  const deployer = new ContractDeployer<FlipperContractApi>(api, flipper, binary);

  // Dry-run to estimate gas fee
  const {
    raw: { gasRequired, storageDeposit },
    inputBytes,
  } = await deployer.query.newDefault({
    caller,
    salt,
  });

  const contractAddress = create2(toEthAddress(caller), binary, inputBytes, salt);

  console.log(`[${api.rpcVersion}] Deploying contract...`);
  await deployer.tx
    .newDefault({ gasLimit: gasRequired, storageDepositLimit: storageDeposit.value, salt })
    .signAndSend(alicePair, async ({ status }) => {
      console.log(`[${api.rpcVersion}] Transaction status:`, status.type);
    })
    .untilFinalized();
  console.log(`[${api.rpcVersion}] Deployed contract address`, contractAddress);

  return contractAddress;
};
