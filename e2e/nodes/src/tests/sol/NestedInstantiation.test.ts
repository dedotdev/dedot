import { ContractDeployer, toEvmAddress } from 'dedot/contracts';
import { beforeAll, describe, expect, it } from 'vitest';
import { childSolCode, parentSolAbi, parentSolCode } from '../../contracts/factory-sol/index.js';
import { devPairs } from '../../utils.js';

/**
 * `Parent` instantiates `Child` in its constructor.
 *
 * The deployer should resolve the address of `Parent` (the contract deployed by the signer), not `Child`,
 * no matter how many `Revive.Instantiated` events are emitted for the deployment.
 */
describe('sol nested instantiation', () => {
  const { alice } = devPairs();
  let deployer: ContractDeployer;

  beforeAll(async () => {
    // `new Child()` instantiates from an on-chain code hash, so the child code needs to be uploaded first
    await reviveClient.tx.revive
      .uploadCode(childSolCode, 10_000_000_000_000n) // --
      .signAndSend(alice)
      .untilFinalized();

    deployer = new ContractDeployer(reviveClient, parentSolAbi as any, parentSolCode, {
      defaultCaller: alice.address,
    });
  });

  const expectParentResolved = async (txResult: any, marker: bigint) => {
    const instantiated = reviveClient.events.revive.Instantiated.filter(txResult.events).map(
      (e) => (e.palletEvent as any).data,
    );
    expect(instantiated.length).toBeGreaterThanOrEqual(1);

    const parentEvent = instantiated.find((e) => e.deployer.toLowerCase() === toEvmAddress(alice.address));
    expect(parentEvent).toBeDefined();

    const contractAddress = await txResult.contractAddress();
    expect(contractAddress).toEqual(parentEvent!.contract);

    // Parent-only messages should work on the resolved contract
    const contract = await txResult.contract();
    expect(contract.address).toEqual(parentEvent!.contract);

    const { data: actualMarker } = await contract.query.marker();
    expect(actualMarker).toEqual(marker);

    // The child is a different contract, deployed by the parent
    const { data: childAddress } = await contract.query.child();
    expect(childAddress.toLowerCase()).not.toEqual(contractAddress.toLowerCase());

    const childInfo = await reviveClient.query.revive.accountInfoOf(childAddress.toLowerCase());
    expect(childInfo).toBeDefined();

    console.log('Parent:', contractAddress, '- Child:', childAddress, '- Instantiated events:', instantiated.length);
  };

  it('should resolve the parent address without salt', async () => {
    const txResult = await deployer.tx
      .constructor(42n) // --
      .signAndSend(alice)
      .untilFinalized();

    await expectParentResolved(txResult, 42n);
  });

  it('should resolve the parent address with salt', async () => {
    const salt = ('0x' + Date.now().toString(16).padStart(64, '0')) as `0x${string}`;

    const txResult = await deployer.tx
      .constructor(43n, { salt }) // --
      .signAndSend(alice)
      .untilFinalized();

    await expectParentResolved(txResult, 43n);
  });
});
