import Keyring from '@polkadot/keyring';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import { DedotClient, ISubstrateClient, WsProvider } from 'dedot';
import { Contract, ContractDeployer } from 'dedot/contracts';
import { assert, stringToHex } from 'dedot/utils';
import { Psp22ContractApi } from '../../../examples/scripts/inkv5/psp22';
import * as psp22Raw from '../../../examples/scripts/inkv5/psp22.json';

export const run = async (_nodeName: any, networkInfo: any) => {
  await cryptoWaitReady();

  const alicePair = new Keyring({ type: 'sr25519' }).addFromUri('//Alice');
  const bobPair = new Keyring({ type: 'sr25519' }).addFromUri('//Bob');
  const { wsUri } = networkInfo.nodesByName['collator-1'];

  const alice = alicePair.address;
  const bob = bobPair.address;

  const verifyPsp22Storage = async (api: ISubstrateClient) => {
    console.log(`[${api.rpcVersion}] Testing PSP22 contract storage API`);

    // Deploy the contract
    const deployer = new ContractDeployer<Psp22ContractApi>(api, psp22Raw, psp22Raw.source.wasm, {
      defaultCaller: alice,
    });

    // Generate a unique salt
    const timestamp = await api.query.timestamp.now();
    const salt = stringToHex(`${api.rpcVersion}_${timestamp}`);

    // Deploy the contract
    const { events } = await deployer.tx
      .new(
        1000000000000n, // total_supply
        'Test Token', // name
        'TST', // symbol
        18, // decimal
        { salt },
      )
      .signAndSend(alicePair, ({ status }) => {
        console.log(`[${api.rpcVersion}] Transaction status:`, status.type);
      })
      .untilFinalized();

    // Extract the contract address from the events
    const instantiatedEvent = api.events.contracts.Instantiated.find(events);
    assert(instantiatedEvent, 'Event Contracts.Instantiated should be available');

    const contractAddress = instantiatedEvent.palletEvent.data.contract.address();
    console.log(`[${api.rpcVersion}] Deployed contract address`, contractAddress);

    // Create a Contract instance with the deployed address
    const contract = new Contract<Psp22ContractApi>(api, psp22Raw, contractAddress, { defaultCaller: alice });

    // Test root() storage method
    console.log(`[${api.rpcVersion}] Testing root() storage method`);
    const root = await contract.storage.root();

    // Verify token metadata
    console.log(`[${api.rpcVersion}] Token name:`, root.name);
    assert(root.name === 'Test Token', 'Token name should be "Test Token"');

    console.log(`[${api.rpcVersion}] Token symbol:`, root.symbol);
    assert(root.symbol === 'TST', 'Token symbol should be "TST"');

    console.log(`[${api.rpcVersion}] Token decimals:`, root.decimals);
    assert(root.decimals === 18, 'Token decimals should be 18');

    console.log(`[${api.rpcVersion}] Total supply:`, root.data.totalSupply);
    assert(root.data.totalSupply === 1000000000000n, 'Total supply should be 1000000000000');

    // Check Alice's balance (should be the total supply)
    const aliceBalance = await root.data.balances.get(alice);
    console.log(`[${api.rpcVersion}] Alice balance:`, aliceBalance);
    assert(aliceBalance === 1000000000000n, 'Alice should have the total supply');

    // Check Bob's balance (should be 0)
    const bobBalance = await root.data.balances.get(bob);
    console.log(`[${api.rpcVersion}] Bob balance:`, bobBalance);
    assert(bobBalance === undefined || bobBalance === 0n, 'Bob should have 0 balance');

    // Test lazy() storage method
    console.log(`[${api.rpcVersion}] Testing lazy() storage method`);
    const lazy = contract.storage.lazy();

    // Check Alice's balance using lazy storage
    const lazyAliceBalance = await lazy.data.balances.get(alice);
    console.log(`[${api.rpcVersion}] lazy Alice balance:`, lazyAliceBalance);
    assert(lazyAliceBalance === 1000000000000n, 'lazy Alice should have the total supply');

    // Check Bob's balance using lazy storage
    const lazyBobBalance = await lazy.data.balances.get(bob);
    console.log(`[${api.rpcVersion}] lazy Bob balance:`, lazyBobBalance);
    assert(lazyBobBalance === undefined || lazyBobBalance === 0n, 'lazy Bob should have 0 balance');

    // Transfer tokens from Alice to Bob
    console.log(`[${api.rpcVersion}] Transferring tokens from Alice to Bob`);
    const transferAmount = 100000000000n; // 10% of total supply

    await contract.tx
      .psp22Transfer(bob, transferAmount, new Uint8Array())
      .signAndSend(alicePair, ({ status }) => {
        console.log(`[${api.rpcVersion}] Transfer status:`, status.type);
      })
      .untilFinalized();

    // Verify storage after transfer using root()
    console.log(`[${api.rpcVersion}] Testing root() storage after transfer`);
    const rootAfterTransfer = await contract.storage.root();

    // Check Alice's balance after transfer
    const aliceBalanceAfterTransfer = await rootAfterTransfer.data.balances.get(alice);
    console.log(`[${api.rpcVersion}] Alice balance after transfer:`, aliceBalanceAfterTransfer);
    assert(aliceBalanceAfterTransfer === 900000000000n, 'Alice should have 900000000000 after transfer');

    // Check Bob's balance after transfer
    const bobBalanceAfterTransfer = await rootAfterTransfer.data.balances.get(bob);
    console.log(`[${api.rpcVersion}] Bob balance after transfer:`, bobBalanceAfterTransfer);
    assert(bobBalanceAfterTransfer === 100000000000n, 'Bob should have 100000000000 after transfer');

    // Verify storage after transfer using lazy()
    console.log(`[${api.rpcVersion}] Testing lazy() storage after transfer`);
    const lazyAfterTransfer = contract.storage.lazy();

    // Check Alice's balance after transfer using lazy storage
    const lazyAliceBalanceAfterTransfer = await lazyAfterTransfer.data.balances.get(alice);
    console.log(`[${api.rpcVersion}] lazy Alice balance after transfer:`, lazyAliceBalanceAfterTransfer);
    assert(lazyAliceBalanceAfterTransfer === 900000000000n, 'lazy Alice should have 900000000000 after transfer');

    // Check Bob's balance after transfer using lazy storage
    const lazyBobBalanceAfterTransfer = await lazyAfterTransfer.data.balances.get(bob);
    console.log(`[${api.rpcVersion}] lazy Bob balance after transfer:`, lazyBobBalanceAfterTransfer);
    assert(lazyBobBalanceAfterTransfer === 100000000000n, 'lazy Bob should have 100000000000 after transfer');

    // Test allowances
    console.log(`[${api.rpcVersion}] Testing allowances`);

    // Approve Bob to spend Alice's tokens
    const approveAmount = 50000000000n;

    await contract.tx
      .psp22Approve(bob, approveAmount)
      .signAndSend(alicePair, ({ status }) => {
        console.log(`[${api.rpcVersion}] Approve status:`, status.type);
      })
      .untilFinalized();

    // Check allowance using root()
    const rootAfterApprove = await contract.storage.root();
    const allowance = await rootAfterApprove.data.allowances.get([alice, bob]);
    console.log(`[${api.rpcVersion}] Allowance:`, allowance);
    assert(allowance === approveAmount, `Allowance should be ${approveAmount}`);

    // Check allowance using lazy()
    const lazyAfterApprove = contract.storage.lazy();
    const lazyAllowance = await lazyAfterApprove.data.allowances.get([alice, bob]);
    console.log(`[${api.rpcVersion}] lazy allowance:`, lazyAllowance);
    assert(lazyAllowance === approveAmount, `lazy allowance should be ${approveAmount}`);

    console.log(`[${api.rpcVersion}] PSP22 contract storage API tests passed`);
  };

  // Test with legacy client
  console.log('Testing with legacy client');
  const apiLegacy = await DedotClient.legacy(new WsProvider(wsUri));
  await verifyPsp22Storage(apiLegacy);

  // Test with new client
  console.log('Testing with new client');
  const apiV2 = await DedotClient.new(new WsProvider(wsUri));
  await verifyPsp22Storage(apiV2);
};
