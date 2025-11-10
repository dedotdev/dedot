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

    it('should send tx and wait until finalized', async () => {
      const { data: initialState } = await contract.query.get();
      expect(initialState).toBeDefined();

      const signedTx = await contract.tx.flip().sign(alice);

      const result = await contractsClient.sendTx(signedTx.toHex()).untilFinalized();

      expect(result.status.type).toBe('Finalized');
      expect(result.txHash).toBeDefined();
      expect(result.events.length).toBeGreaterThan(0);

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

    it('should receive correct status updates in callback', async () => {
      const signedTx = await contract.tx.flip().sign(alice);

      const statuses: string[] = [];
      const result = await contractsClient
        .sendTx(signedTx.toHex(), (result) => {
          statuses.push(result.status.type);
        })
        .untilFinalized();

      expect(result.status.type).toBe('Finalized');
      // Should have received various status updates
      expect(statuses.length).toBeGreaterThan(0);
      expect(statuses).toContain('Finalized');
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

    it('should send tx and wait until best chain block included', async () => {
      const { data: initialState } = await contract.query.get();
      expect(initialState).toBeDefined();

      const signedTx = await contract.tx.flip().sign(alice);

      const result = await reviveClient.sendTx(signedTx.toHex()).untilBestChainBlockIncluded();

      expect(result.status.type).toBe('BestChainBlockIncluded');
      expect(result.txHash).toBeDefined();
      expect(result.events.length).toBeGreaterThan(0);

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

    it('should receive correct status updates in callback', async () => {
      const signedTx = await contract.tx.flip().sign(alice);

      const statuses: string[] = [];
      const result = await reviveClient
        .sendTx(signedTx.toHex(), (result) => {
          statuses.push(result.status.type);
        })
        .untilBestChainBlockIncluded();

      expect(result.status.type).toBe('BestChainBlockIncluded');
      // Should have received various status updates
      expect(statuses.length).toBeGreaterThan(0);
      expect(statuses).toContain('BestChainBlockIncluded');
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
});
