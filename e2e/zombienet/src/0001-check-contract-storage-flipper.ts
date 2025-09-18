import Keyring from '@polkadot/keyring';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import { DedotClient, ISubstrateClient, LegacyClient, WsProvider } from 'dedot';
import { SubstrateApi } from 'dedot/chaintypes';
import { Contract, ContractDeployer } from 'dedot/contracts';
import { RpcVersion } from 'dedot/types';
import { assert, stringToHex } from 'dedot/utils';
import * as flipperV5 from '../../../examples/scripts/inkv5/flipper.json';
import { FlipperContractApi } from '../../../examples/scripts/inkv5/flipper/index.js';

export const run = async (_nodeName: any, networkInfo: any) => {
  await cryptoWaitReady();

  const alicePair = new Keyring({ type: 'sr25519' }).addFromUri('//Alice');
  const { wsUri } = networkInfo.nodesByName['collator-1'];

  const caller = alicePair.address;

  const verifyFlipperStorage = async (api: ISubstrateClient<SubstrateApi[RpcVersion]>) => {
    console.log(`[${api.rpcVersion}] Testing Flipper contract storage API`);

    // Deploy the contract
    const wasm = flipperV5.source.wasm!;
    const deployer = new ContractDeployer<FlipperContractApi>(api, flipperV5, wasm, { defaultCaller: caller });

    // Generate a unique salt
    const timestamp = await api.query.timestamp.now();
    const salt = stringToHex(`${api.rpcVersion}_${timestamp}`);

    // Deploy with initial value = true
    const { events } = await deployer.tx
      .new(true, { salt })
      .signAndSend(alicePair, ({ status }) => {
        console.log(`[${api.rpcVersion}] Transaction status:`, status.type);
      })
      .untilFinalized();

    const instantiatedEvent = api.events.contracts.Instantiated.find(events);
    assert(instantiatedEvent, 'Event Contracts.Instantiated should be available');

    const contractAddress = instantiatedEvent.palletEvent.data.contract.address();
    console.log(`[${api.rpcVersion}] Deployed contract address`, contractAddress);

    // Create a Contract instance
    const contract = new Contract<FlipperContractApi>(api, flipperV5, contractAddress, { defaultCaller: caller });

    // Test root() storage method
    console.log(`[${api.rpcVersion}] Testing root() storage method`);
    const root = await contract.storage.root();

    // Verify initial value is true
    const initialValue = await root.value.get();
    console.log(`[${api.rpcVersion}] Initial value:`, initialValue);
    assert(initialValue === true, 'Initial value should be true');

    // Verify owner is set to caller
    const owner = await root.owner.get();
    console.log(`[${api.rpcVersion}] Owner:`, owner?.address());
    assert(owner?.eq(caller), 'Owner should be set to caller');

    // Test lazy() storage method
    console.log(`[${api.rpcVersion}] Testing lazy() storage method`);
    const lazy = contract.storage.lazy();

    // Verify lazy value is true
    const lazyValue = await lazy.value.get();
    console.log(`[${api.rpcVersion}] lazy value:`, lazyValue);
    assert(lazyValue === true, 'lazy value should be true');

    // Verify lazy owner is set to caller
    const lazyOwner = await lazy.owner.get();
    console.log(`[${api.rpcVersion}] lazy owner:`, lazyOwner?.address());
    assert(lazyOwner?.eq(caller), 'lazy owner should be set to caller');

    // Flip the value
    console.log(`[${api.rpcVersion}] Flipping the value`);

    await contract.tx
      .flip()
      .signAndSend(alicePair, ({ status }) => {
        console.log(`[${api.rpcVersion}] Transaction status:`, status.type);
      })
      .untilFinalized();

    // Verify root() storage after flip
    console.log(`[${api.rpcVersion}] Testing root() storage after flip`);
    const rootAfterFlip = await contract.storage.root();

    // Verify value is now false
    const valueAfterFlip = await rootAfterFlip.value.get();
    console.log(`[${api.rpcVersion}] Value after flip:`, valueAfterFlip);
    assert(valueAfterFlip === false, 'Value after flip should be false');

    // Verify owner is still set to caller
    const ownerAfterFlip = await rootAfterFlip.owner.get();
    console.log(`[${api.rpcVersion}] Owner after flip:`, ownerAfterFlip?.address());
    assert(ownerAfterFlip?.eq(caller), 'Owner after flip should still be set to caller');

    // Verify lazy() storage after flip
    console.log(`[${api.rpcVersion}] Testing lazy() storage after flip`);
    const lazyAfterFlip = contract.storage.lazy();

    // Verify lazy value is now false
    const lazyValueAfterFlip = await lazyAfterFlip.value.get();
    console.log(`[${api.rpcVersion}] lazy value after flip:`, lazyValueAfterFlip);
    assert(lazyValueAfterFlip === false, 'lazy value after flip should be false');

    // Verify lazy owner is still set to caller
    const lazyOwnerAfterFlip = await lazyAfterFlip.owner.get();
    console.log(`[${api.rpcVersion}] lazy owner after flip:`, lazyOwnerAfterFlip?.address());
    assert(lazyOwnerAfterFlip?.eq(caller), 'lazy owner after flip should still be set to caller');

    console.log(`[${api.rpcVersion}] Flipper contract storage API tests passed`);
  };

  // Test with legacy client
  console.log('Testing with legacy client');
  const apiLegacy = await LegacyClient.new(new WsProvider(wsUri));
  await verifyFlipperStorage(apiLegacy);

  // Test with new client
  console.log('Testing with new client');
  const apiV2 = await DedotClient.new(new WsProvider(wsUri));
  await verifyFlipperStorage(apiV2);
};
