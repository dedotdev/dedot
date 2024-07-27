import Keyring from '@polkadot/keyring';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import { DedotClient, ISubstrateClient, LegacyClient, WsProvider } from 'dedot';
import {
  Contract,
  ContractDeployer,
  ContractMetadata,
  isContractDispatchError,
  isContractInstantiateDispatchError,
  isContractInstantiateLangError,
  isContractLangError,
  parseRawMetadata,
} from 'dedot/contracts';
import { assert, stringToHex } from 'dedot/utils';
import * as flipperV4Raw from '../flipper_v4.json';
import * as flipperV5Raw from '../flipper_v5.json';
import { FlipperContractApi } from './contracts/flipper';
import { deployFlipper } from './shared';

export const run = async (_nodeName: any, networkInfo: any) => {
  await cryptoWaitReady();

  const alicePair = new Keyring({ type: 'sr25519' }).addFromUri('//Alice');
  const { wsUri } = networkInfo.nodesByName['collator-1'];

  const caller = alicePair.address;
  const flipperV4 = parseRawMetadata(JSON.stringify(flipperV4Raw));
  const flipperV5 = parseRawMetadata(JSON.stringify(flipperV5Raw));

  const verifyContracts = async (api: ISubstrateClient, flipper: ContractMetadata) => {
    const wasm = flipper.source.wasm!;
    const deployer = new ContractDeployer<FlipperContractApi>(api, flipper, wasm);
    const salt = stringToHex(api.rpcVersion);
    const blank = '0x0000000000000000000000000000000000000000000000000000000000000000';

    const { data } = await deployer.query.fromSeed(blank, { caller, salt });
    assert(data.isErr && data.err === 'ZeroSum', 'Expected to throw error!');
    
    const contractAddress = await deployFlipper(api, flipper, salt);
    const contract = new Contract<FlipperContractApi>(api, flipper, contractAddress);

    const { data: info } = await contract.query.flipWithSeed(blank, { caller });
    assert(info.isErr && info.err === 'ZeroSum', 'Expected to throw error!');

    // If re-create a contract with same salt, DispatchError throw!
    try {
      await deployer.query.new(true, { caller, salt });

      throw new Error('Expected to throw error!');
    } catch (e: any) {
      assert(isContractInstantiateDispatchError(e), 'Should throw ContractInstantiateDispatchError!');
    }

    // If input parameters is not in correct format, LangError throw!
    try {
      await deployer.query.fromSeed('0x_error', { caller, salt: '0x' });

      throw new Error('Expected to throw error!');
    } catch (e: any) {
      assert(isContractInstantiateLangError(e), 'Should throw ContractInstantiateLangError!');
    }

    // If caller's balance is zero, DispatchError throw!
    try {
      const contract = new Contract<FlipperContractApi>(api, flipper, alicePair.addressRaw);
      await contract.query.flip({ caller });

      throw new Error('Expected to throw error!'); } catch (e: any) {
      assert(isContractDispatchError(e), 'Should throw ContractDispatchError!');
    }

    // If input parameters is not in correct format, LangError throw!
    try {
      await contract.query.flipWithSeed('0x_error', { caller });

      throw new Error('Expected to throw error!');
    } catch (e: any) {
      assert(isContractLangError(e), 'Should throw ContractLangError!');
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
