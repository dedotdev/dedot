import { assert } from 'dedot/utils';
import { describe, expect, it } from 'vitest';
import { devPairs } from '../utils.js';

describe('toTx', () => {
  const { alice, bob } = devPairs();
  const TEN_UNIT = BigInt(10 * 1e12);

  describe('LegacyClient', () => {
    it('should send tx from hex string via toTx', async () => {
      const prevBobBalance = (await contractsClient.query.system.account(bob.address)).data.free;

      const signedTx = await contractsClient.tx.balances.transferKeepAlive(bob.address, TEN_UNIT).sign(alice);
      const hex = signedTx.toHex();

      const submittable = contractsClient.toTx(hex);
      const result = await submittable.send().untilFinalized();

      expect(result.status.type).toBe('Finalized');
      expect(result.txHash).toBeDefined();

      const newBobBalance = (await contractsClient.query.system.account(bob.address)).data.free;
      expect(newBobBalance).toBe(prevBobBalance + TEN_UNIT);
    });

    it('should send tx from Extrinsic object via toTx', async () => {
      const prevBobBalance = (await contractsClient.query.system.account(bob.address)).data.free;

      const signedTx = await contractsClient.tx.balances.transferKeepAlive(bob.address, TEN_UNIT).sign(alice);

      const submittable = contractsClient.toTx(signedTx);
      const result = await submittable.send().untilFinalized();

      expect(result.status.type).toBe('Finalized');
      expect(result.txHash).toBeDefined();

      const newBobBalance = (await contractsClient.query.system.account(bob.address)).data.free;
      expect(newBobBalance).toBe(prevBobBalance + TEN_UNIT);
    });

    it('should get paymentInfo from toTx on a signed tx', async () => {
      const signedTx = await contractsClient.tx.balances.transferKeepAlive(bob.address, TEN_UNIT).sign(alice);
      const hex = signedTx.toHex();

      const submittable = contractsClient.toTx(hex);
      const paymentInfo = await submittable.paymentInfo(alice.address);

      expect(paymentInfo).toBeDefined();
      expect(paymentInfo.partialFee).toBeGreaterThan(0n);
    });

    it('should signAndSend unsigned tx via toTx', async () => {
      const remarkMessage = 'Hello from toTx unsigned test';
      const unsignedTx = contractsClient.tx.system.remarkWithEvent(remarkMessage);
      const hex = unsignedTx.toHex();

      const submittable = contractsClient.toTx(hex);
      const result = await submittable.signAndSend(alice).untilFinalized();

      expect(result.status.type).toBe('Finalized');
      expect(result.txHash).toBeDefined();

      const remarkedEvent = contractsClient.events.system.Remarked.find(result.events);
      assert(remarkedEvent, 'Remarked event should be emitted');
    });
  });

  describe('V2Client', () => {
    it('should send tx from hex string via toTx', async () => {
      const prevBobBalance = (await reviveClient.query.system.account(bob.address)).data.free;

      const signedTx = await reviveClient.tx.balances.transferKeepAlive(bob.address, TEN_UNIT).sign(alice);
      const hex = signedTx.toHex();

      const submittable = reviveClient.toTx(hex);
      const result = await submittable.send().untilBestChainBlockIncluded();

      expect(result.status.type).toBe('BestChainBlockIncluded');
      expect(result.txHash).toBeDefined();

      const newBobBalance = (await reviveClient.query.system.account(bob.address)).data.free;
      expect(newBobBalance).toBe(prevBobBalance + TEN_UNIT);
    });

    it('should send tx from Extrinsic object via toTx', async () => {
      const prevBobBalance = (await reviveClient.query.system.account(bob.address)).data.free;

      const signedTx = await reviveClient.tx.balances.transferKeepAlive(bob.address, TEN_UNIT).sign(alice);

      const submittable = reviveClient.toTx(signedTx);
      const result = await submittable.send().untilBestChainBlockIncluded();

      expect(result.status.type).toBe('BestChainBlockIncluded');
      expect(result.txHash).toBeDefined();

      const newBobBalance = (await reviveClient.query.system.account(bob.address)).data.free;
      expect(newBobBalance).toBe(prevBobBalance + TEN_UNIT);
    });

    it('should get paymentInfo from toTx on a signed tx', async () => {
      const signedTx = await reviveClient.tx.balances.transferKeepAlive(bob.address, TEN_UNIT).sign(alice);
      const hex = signedTx.toHex();

      const submittable = reviveClient.toTx(hex);
      const paymentInfo = await submittable.paymentInfo(alice.address);

      expect(paymentInfo).toBeDefined();
      expect(paymentInfo.partialFee).toBeGreaterThan(0n);
    });

    it('should signAndSend unsigned tx via toTx', async () => {
      const remarkMessage = 'Hello from toTx unsigned V2 test';
      const unsignedTx = reviveClient.tx.system.remarkWithEvent(remarkMessage);
      const hex = unsignedTx.toHex();

      const submittable = reviveClient.toTx(hex);
      const result = await submittable.signAndSend(alice).untilBestChainBlockIncluded();

      expect(result.status.type).toBe('BestChainBlockIncluded');
      expect(result.txHash).toBeDefined();

      const remarkedEvent = reviveClient.events.system.Remarked.find(result.events);
      assert(remarkedEvent, 'Remarked event should be emitted');
    });
  });
});
