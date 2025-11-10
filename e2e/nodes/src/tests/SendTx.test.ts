import { Contract } from 'dedot/contracts';
import { ISubmittableResult } from 'dedot/types';
import { assert } from 'dedot/utils';
import { beforeEach, describe, expect, it } from 'vitest';
import { FlipperContractApi } from '../contracts/flipper';
import { devPairs, flipperV5Metadata, flipperV6Metadata, deployFlipperV5, deployFlipperV6 } from '../utils.js';

describe('SendTx', () => {
  const { alice: alice } = devPairs();

  describe('LegacyClient (Contracts)', () => {
    let contract: Contract<FlipperContractApi>;

    beforeEach(async () => {
      const contractAddress = await deployFlipperV5(alice);
      contract = new Contract<FlipperContractApi>(contractsClient, flipperV5Metadata, contractAddress, {
        defaultCaller: alice.address,
      });
    });

    it('should send tx with hex string and callback', async () => {
      const { data: initialState } = await contract.query.get();
      expect(initialState).toBeDefined();

      const signedTx = await contract.tx.flip().sign(alice);

      const results: ISubmittableResult[] = [];
      const finalResult = await contractsClient
        .sendTx(signedTx.toHex(), (result) => {
          results.push(result);
        })
        .untilFinalized();

      // Verify callback was called with results
      expect(results.length).toBeGreaterThan(0);
      expect(finalResult.status.type).toBe('Finalized');
      expect(finalResult.txHash).toBeDefined();

      // Verify state changed
      const { data: newState } = await contract.query.get();
      expect(newState).toEqual(!initialState);
    });

    it('should send tx with Extrinsic object', async () => {
      const { data: initialState } = await contract.query.get();
      expect(initialState).toBeDefined();

      const signedTx = await contract.tx.flip().sign(alice);

      // Send the Extrinsic object directly instead of hex string
      const result = await contractsClient.sendTx(signedTx).untilFinalized();

      expect(result.status.type).toBe('Finalized');
      expect(result.txHash).toBeDefined();

      // Verify state changed
      const { data: newState } = await contract.query.get();
      expect(newState).toEqual(!initialState);
    });

    it('should emit contract events correctly', async () => {
      const signedTx = await contract.tx.flip().sign(alice);

      const result = await contractsClient.sendTx(signedTx.toHex()).untilFinalized();

      expect(result.events.length).toBeGreaterThan(0);

      // Find the Flipped event
      const flippedEvent = contract.events.Flipped.find(result.events);
      assert(flippedEvent, 'Flipped event should be emitted');
      expect(flippedEvent.data).toBeDefined();
    });

    it('should return unsubscribe function when awaited directly', async () => {
      const signedTx = await contract.tx.flip().sign(alice);

      let callbackCount = 0;
      const unsub = await contractsClient.sendTx(signedTx.toHex(), () => {
        callbackCount++;
      });

      // unsub should be a function
      expect(typeof unsub).toBe('function');

      setTimeout(() => {
        // Callback should have been called at least once before we got the unsub
        expect(callbackCount).toBeGreaterThan(0);

        // Call unsub to clean up
        unsub();
      }, 3_000);
    });
  });

  describe('V2Client (Revive)', () => {
    let contract: Contract<FlipperContractApi>;

    beforeEach(async () => {
      const contractAddress = await deployFlipperV6(alice);
      contract = new Contract<FlipperContractApi>(reviveClient, flipperV6Metadata, contractAddress, {
        defaultCaller: alice.address,
      });
    });

    it('should send tx with hex string and callback', async () => {
      const { data: initialState } = await contract.query.get();
      expect(initialState).toBeDefined();

      const signedTx = await contract.tx.flip().sign(alice);

      const results: ISubmittableResult[] = [];
      const finalResult = await reviveClient
        .sendTx(signedTx.toHex(), (result) => {
          results.push(result);
        })
        .untilBestChainBlockIncluded();

      // Verify callback was called with results
      expect(results.length).toBeGreaterThan(0);
      expect(finalResult.status.type).toBe('BestChainBlockIncluded');
      expect(finalResult.txHash).toBeDefined();

      // Verify state changed
      const { data: newState } = await contract.query.get();
      expect(newState).toEqual(!initialState);
    });

    it('should send tx with Extrinsic object', async () => {
      const { data: initialState } = await contract.query.get();
      expect(initialState).toBeDefined();

      const signedTx = await contract.tx.flip().sign(alice);

      // Send the Extrinsic object directly instead of hex string
      const result = await reviveClient.sendTx(signedTx).untilBestChainBlockIncluded();

      expect(result.status.type).toBe('BestChainBlockIncluded');
      expect(result.txHash).toBeDefined();

      // Verify state changed
      const { data: newState } = await contract.query.get();
      expect(newState).toEqual(!initialState);
    });

    it('should emit contract events correctly', async () => {
      const signedTx = await contract.tx.flip().sign(alice);

      const result = await reviveClient.sendTx(signedTx.toHex()).untilBestChainBlockIncluded();

      expect(result.events.length).toBeGreaterThan(0);

      // Find the Flipped event
      const flippedEvent = contract.events.Flipped.find(result.events);
      assert(flippedEvent, 'Flipped event should be emitted');
      expect(flippedEvent.data).toBeDefined();
    });

    it('should return unsubscribe function when awaited directly', async () => {
      const signedTx = await contract.tx.flip().sign(alice);

      let callbackCount = 0;
      const unsub = await reviveClient.sendTx(signedTx.toHex(), () => {
        callbackCount++;
      });

      // unsub should be a function
      expect(typeof unsub).toBe('function');

      // Callback should have been called at least once before we got the unsub
      expect(callbackCount).toBeGreaterThan(0);

      // Call unsub to clean up
      unsub();
    });

    it('should wait until finalized for V2Client', async () => {
      const { data: initialState } = await contract.query.get();
      expect(initialState).toBeDefined();

      const signedTx = await contract.tx.flip().sign(alice);

      const result = await reviveClient.sendTx(signedTx.toHex()).untilFinalized();

      expect(result.status.type).toBe('Finalized');
      expect(result.txHash).toBeDefined();

      // Verify state changed
      const { data: newState } = await contract.query.get();
      expect(newState).toEqual(!initialState);
    });
  });

  describe('LegacyClient (Non-Contract Transactions)', () => {
    const { bob } = devPairs();
    const TEN_UNIT = BigInt(10 * 1e12);

    it('should send balance transfer with hex string', async () => {
      const prevBobBalance = (await contractsClient.query.system.account(bob.address)).data.free;

      const signedTx = await contractsClient.tx.balances.transferKeepAlive(bob.address, TEN_UNIT).sign(alice);

      const result = await contractsClient.sendTx(signedTx.toHex()).untilFinalized();

      expect(result.status.type).toBe('Finalized');
      expect(result.txHash).toBeDefined();

      // Verify balance changed
      const newBobBalance = (await contractsClient.query.system.account(bob.address)).data.free;
      expect(newBobBalance).toBe(prevBobBalance + TEN_UNIT);
    });

    it('should send balance transfer with callback', async () => {
      const signedTx = await contractsClient.tx.balances.transferKeepAlive(bob.address, TEN_UNIT).sign(alice);

      const statuses: string[] = [];
      const result = await contractsClient
        .sendTx(signedTx.toHex(), (result) => {
          statuses.push(result.status.type);
        })
        .untilFinalized();

      expect(result.status.type).toBe('Finalized');
      expect(statuses.length).toBeGreaterThan(0);
      expect(statuses).toContain('Finalized');
    });

    it('should emit Transfer event for balance transfer', async () => {
      const signedTx = await contractsClient.tx.balances.transferKeepAlive(bob.address, TEN_UNIT).sign(alice);

      const result = await contractsClient.sendTx(signedTx.toHex()).untilFinalized();

      expect(result.events.length).toBeGreaterThan(0);

      const transferEvent = contractsClient.events.balances.Transfer.find(result.events);
      assert(transferEvent, 'Transfer event should be emitted');
      expect(transferEvent.palletEvent.data.from).toBeDefined();
      expect(transferEvent.palletEvent.data.to).toBeDefined();
      expect(transferEvent.palletEvent.data.amount).toBe(TEN_UNIT);
    });

    it('should send system remark with Extrinsic object', async () => {
      const remarkMessage = 'Hello from sendTx test';
      const signedTx = await contractsClient.tx.system.remarkWithEvent(remarkMessage).sign(alice);

      // Send Extrinsic object directly
      const result = await contractsClient.sendTx(signedTx).untilFinalized();

      expect(result.status.type).toBe('Finalized');
      expect(result.txHash).toBeDefined();

      const remarkedEvent = contractsClient.events.system.Remarked.find(result.events);
      assert(remarkedEvent, 'Remarked event should be emitted');
    });

    it('should send utility batch transaction', async () => {
      const transferCall = contractsClient.tx.balances.transferKeepAlive(bob.address, TEN_UNIT).call;
      const remarkCall: any = {
        pallet: 'System',
        palletCall: { name: 'RemarkWithEvent', params: { remark: 'Batch test' } },
      };

      const signedTx = await contractsClient.tx.utility.batch([transferCall, remarkCall]).sign(alice);

      const result = await contractsClient.sendTx(signedTx.toHex()).untilFinalized();

      expect(result.status.type).toBe('Finalized');
      expect(result.events.length).toBeGreaterThan(0);

      // Check both events were emitted
      const transferEvent = contractsClient.events.balances.Transfer.find(result.events);
      const remarkedEvent = contractsClient.events.system.Remarked.find(result.events);
      const batchCompletedEvent = contractsClient.events.utility.BatchCompleted.find(result.events);

      assert(transferEvent, 'Transfer event should be emitted');
      assert(remarkedEvent, 'Remarked event should be emitted');
      assert(batchCompletedEvent, 'BatchCompleted event should be emitted');
    });
  });

  describe('V2Client (Non-Contract Transactions)', () => {
    const { bob } = devPairs();
    const TEN_UNIT = BigInt(10 * 1e12);

    it('should send balance transfer with hex string', async () => {
      const prevBobBalance = (await reviveClient.query.system.account(bob.address)).data.free;

      const signedTx = await reviveClient.tx.balances.transferKeepAlive(bob.address, TEN_UNIT).sign(alice);

      const result = await reviveClient.sendTx(signedTx.toHex()).untilBestChainBlockIncluded();

      expect(result.status.type).toBe('BestChainBlockIncluded');
      expect(result.txHash).toBeDefined();

      // Verify balance changed
      const newBobBalance = (await reviveClient.query.system.account(bob.address)).data.free;
      expect(newBobBalance).toBe(prevBobBalance + TEN_UNIT);
    });

    it('should send balance transfer with callback', async () => {
      const signedTx = await reviveClient.tx.balances.transferKeepAlive(bob.address, TEN_UNIT).sign(alice);

      const statuses: string[] = [];
      const result = await reviveClient
        .sendTx(signedTx.toHex(), (result) => {
          statuses.push(result.status.type);
        })
        .untilBestChainBlockIncluded();

      expect(result.status.type).toBe('BestChainBlockIncluded');
      expect(statuses.length).toBeGreaterThan(0);
      expect(statuses).toContain('BestChainBlockIncluded');
    });

    it('should emit Transfer event for balance transfer', async () => {
      const signedTx = await reviveClient.tx.balances.transferKeepAlive(bob.address, TEN_UNIT).sign(alice);

      const result = await reviveClient.sendTx(signedTx.toHex()).untilBestChainBlockIncluded();

      expect(result.events.length).toBeGreaterThan(0);

      const transferEvent = reviveClient.events.balances.Transfer.find(result.events);
      assert(transferEvent, 'Transfer event should be emitted');
      expect(transferEvent.palletEvent.data.from).toBeDefined();
      expect(transferEvent.palletEvent.data.to).toBeDefined();
      expect(transferEvent.palletEvent.data.amount).toBe(TEN_UNIT);
    });

    it('should send system remark with Extrinsic object', async () => {
      const remarkMessage = 'Hello from sendTx V2 test';
      const signedTx = await reviveClient.tx.system.remarkWithEvent(remarkMessage).sign(alice);

      // Send Extrinsic object directly
      const result = await reviveClient.sendTx(signedTx).untilBestChainBlockIncluded();

      expect(result.status.type).toBe('BestChainBlockIncluded');
      expect(result.txHash).toBeDefined();

      const remarkedEvent = reviveClient.events.system.Remarked.find(result.events);
      assert(remarkedEvent, 'Remarked event should be emitted');
    });

    it('should send utility batch transaction', async () => {
      const transferCall = reviveClient.tx.balances.transferKeepAlive(bob.address, TEN_UNIT).call;
      const remarkCall: any = {
        pallet: 'System',
        palletCall: { name: 'RemarkWithEvent', params: { remark: 'Batch test V2' } },
      };

      const signedTx = await reviveClient.tx.utility.batch([transferCall, remarkCall]).sign(alice);

      const result = await reviveClient.sendTx(signedTx.toHex()).untilBestChainBlockIncluded();

      expect(result.status.type).toBe('BestChainBlockIncluded');
      expect(result.events.length).toBeGreaterThan(0);

      // Check both events were emitted
      const transferEvent = reviveClient.events.balances.Transfer.find(result.events);
      const remarkedEvent = reviveClient.events.system.Remarked.find(result.events);
      const batchCompletedEvent = reviveClient.events.utility.BatchCompleted.find(result.events);

      assert(transferEvent, 'Transfer event should be emitted');
      assert(remarkedEvent, 'Remarked event should be emitted');
      assert(batchCompletedEvent, 'BatchCompleted event should be emitted');
    });

    it('should wait until finalized for non-contract transactions', async () => {
      const signedTx = await reviveClient.tx.balances.transferKeepAlive(bob.address, TEN_UNIT).sign(alice);

      const result = await reviveClient.sendTx(signedTx.toHex()).untilFinalized();

      expect(result.status.type).toBe('Finalized');
      expect(result.txHash).toBeDefined();
    });
  });
});
