import Keyring from '@polkadot/keyring';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import { DedotClient, ISubstrateClient, LegacyClient, WsProvider } from 'dedot';
import { SubstrateApi } from 'dedot/chaintypes';
import {
  Contract,
  ContractDeployer,
  ContractMetadata,
  isContractDispatchError,
  isContractExecutionError,
  isContractInstantiateDispatchError,
  isContractInstantiateError,
  isContractInstantiateLangError,
  isContractLangError,
  parseRawMetadata,
} from 'dedot/contracts';
import { RpcVersion } from 'dedot/types';
import { assert, stringToHex } from 'dedot/utils';
import * as flipperV4Raw from '../flipper_v4.json';
import * as flipperV5Raw from '../flipper_v5.json';
import { FlipperContractApi } from './contracts/flipper';

export const run = async (_nodeName: any, networkInfo: any) => {
  await cryptoWaitReady();

  const alicePair = new Keyring({ type: 'sr25519' }).addFromUri('//Alice');
  const { wsUri } = networkInfo.nodesByName['collator-1'];

  const caller = alicePair.address;
  const flipperV4 = parseRawMetadata(JSON.stringify(flipperV4Raw));
  const flipperV5 = parseRawMetadata(JSON.stringify(flipperV5Raw));

  const verifyContracts = async (api: ISubstrateClient<SubstrateApi[RpcVersion]>, flipper: ContractMetadata) => {
    const wasm = flipper.source.wasm!;
    const deployer = new ContractDeployer<FlipperContractApi>(api, flipper, wasm);

    // Avoid to use same salt with previous tests.
    const timestamp = await api.query.timestamp.now();
    const salt = stringToHex(`${api.rpcVersion}_${timestamp}`);

    const blank = '0x0000000000000000000000000000000000000000000000000000000000000000';

    const { data } = await deployer.query.fromSeed(blank, { caller, salt });
    assert(data.isErr && data.err === 'ZeroSum', 'Should get ZeroSum error here');

    // with customized salt
    const contractAddress = await deployFlipper(api, flipper, salt);

    // Only verify this with one version of the client to prevent code duplication issue.
    if (api.rpcVersion === 'v2') {
      // with empty salt
      const contractAddressWithEmptySalt = await deployFlipper(api, flipper);
      assert(
        contractAddressWithEmptySalt != contractAddress,
        'Should deploy 2 different contracts using different salt',
      );
    }

    const contract = new Contract<FlipperContractApi>(api, flipper, contractAddress);

    const { data: info, flags } = await contract.query.flipWithSeed(blank, { caller });
    assert(info.isErr && info.err === 'ZeroSum', 'Should get ZeroSum error here');
    assert(flags.bits === 1 && flags.revert === true, 'Should get Revert flag here');

    // If re-create a contract with same salt, should be throwing DispatchError
    try {
      await deployer.query.new(true, { caller, salt });

      throw new Error('Expected to throw error!');
    } catch (e: any) {
      assert(isContractInstantiateError(e), 'Should throw ContractInstantiateError!');
      assert(isContractInstantiateDispatchError(e), 'Should throw ContractInstantiateDispatchError!');

      console.log('DispatchError', e.dispatchError);
    }

    // If input parameters is not in correct format, should be throwing LangError
    try {
      await deployer.query.fromSeed('0x_error', { caller, salt: '0x' });

      throw new Error('Expected to throw error!');
    } catch (e: any) {
      assert(isContractInstantiateError(e), 'Should throw ContractInstantiateError!');
      assert(isContractInstantiateLangError(e), 'Should throw ContractInstantiateLangError!');
      assert(e.flags.revert === true && e.flags.bits === 1, 'Should get Revert flag here!');

      console.log('LangError', e.langError);
    }

    // If caller's balance is zero, should be throwing DispatchError
    try {
      const contract = new Contract<FlipperContractApi>(api, flipper, alicePair.address);
      await contract.query.flip({ caller });

      throw new Error('Expected to throw error!');
    } catch (e: any) {
      assert(isContractExecutionError(e), 'Should throw ContractExecutionError!');
      assert(isContractDispatchError(e), 'Should throw ContractDispatchError!');
      console.log('DispatchError', e.dispatchError);
    }

    // If input parameters is not in correct format, should be throwing LangError
    try {
      await contract.query.flipWithSeed('0x_error', { caller });

      throw new Error('Expected to throw error!');
    } catch (e: any) {
      assert(isContractExecutionError(e), 'Should throw ContractExecutionError!');
      assert(isContractLangError(e), 'Should throw ContractLangError!');
      assert(e.flags.revert === true && e.flags.bits === 1, 'Should get Revert flag here!');

      console.log('LangError', e.langError);
    }
  };

  console.log('Checking via legacy API');
  const apiLegacy = await LegacyClient.new(new WsProvider(wsUri));
  await verifyContracts(apiLegacy, flipperV4);
  await verifyContracts(apiLegacy, flipperV5);

  console.log('Checking via new API');
  const apiV2 = await DedotClient.new(new WsProvider(wsUri));
  await verifyContracts(apiV2, flipperV4);
  await verifyContracts(apiV2, flipperV5);
};

const deployFlipper = async (
  api: ISubstrateClient<SubstrateApi[RpcVersion]>,
  flipper: ContractMetadata,
  salt?: string,
): Promise<string> => {
  const alicePair = new Keyring({ type: 'sr25519' }).addFromUri('//Alice');
  const caller = alicePair.address;

  const wasm = flipper.source.wasm!;
  const deployer = new ContractDeployer<FlipperContractApi>(api, flipper, wasm);

  // Dry-run to estimate gas fee
  const {
    raw: { gasRequired },
  } = await deployer.query.new(true, {
    caller,
    salt,
  });

  return await new Promise<string>(async (resolve) => {
    await deployer.tx.new(true, { gasLimit: gasRequired, salt }).signAndSend(alicePair, async ({ status, events }) => {
      console.log(`[${api.rpcVersion}] Transaction status:`, status.type);

      if (status.type === 'Finalized') {
        const instantiatedEvent = api.events.contracts.Instantiated.find(events);

        assert(instantiatedEvent, 'Event Contracts.Instantiated should be available');

        const contractAddress = instantiatedEvent.palletEvent.data.contract.address();
        resolve(contractAddress);
      }
    });
  });
};
