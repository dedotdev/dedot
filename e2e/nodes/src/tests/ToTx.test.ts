import { assert, hexToU8a } from 'dedot/utils';
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

    it('should send tx from Uint8Array via toTx', async () => {
      const prevBobBalance = (await contractsClient.query.system.account(bob.address)).data.free;

      const signedTx = await contractsClient.tx.balances.transferKeepAlive(bob.address, TEN_UNIT).sign(alice);
      const u8a = hexToU8a(signedTx.toHex());

      const submittable = contractsClient.toTx(u8a);
      const result = await submittable.send().untilFinalized();

      expect(result.status.type).toBe('Finalized');
      expect(result.txHash).toBeDefined();

      const newBobBalance = (await contractsClient.query.system.account(bob.address)).data.free;
      expect(newBobBalance).toBe(prevBobBalance + TEN_UNIT);
    });

    it('should signAndSend IRuntimeTxCall via toTx', async () => {
      const prevBobBalance = (await contractsClient.query.system.account(bob.address)).data.free;

      const txCall = contractsClient.tx.balances.transferKeepAlive(bob.address, TEN_UNIT).call;

      const submittable = contractsClient.toTx(txCall);
      const result = await submittable.signAndSend(alice).untilFinalized();

      expect(result.status.type).toBe('Finalized');
      expect(result.txHash).toBeDefined();

      const newBobBalance = (await contractsClient.query.system.account(bob.address)).data.free;
      expect(newBobBalance).toBe(prevBobBalance + TEN_UNIT);
    });

    it('should signAndSend runtime call hex via toTx', async () => {
      const remarkMessage = 'Hello from toTx callHex test';
      const callHex = contractsClient.tx.system.remarkWithEvent(remarkMessage).callHex;

      const submittable = contractsClient.toTx(callHex);
      const result = await submittable.signAndSend(alice).untilFinalized();

      expect(result.status.type).toBe('Finalized');
      expect(result.txHash).toBeDefined();

      const remarkedEvent = contractsClient.events.system.Remarked.find(result.events);
      assert(remarkedEvent, 'Remarked event should be emitted');
    });

    it('should signAndSend runtime call Uint8Array via toTx', async () => {
      const remarkMessage = 'Hello from toTx callU8a test';
      const callU8a = contractsClient.tx.system.remarkWithEvent(remarkMessage).callU8a;

      const submittable = contractsClient.toTx(callU8a);
      const result = await submittable.signAndSend(alice).untilFinalized();

      expect(result.status.type).toBe('Finalized');
      expect(result.txHash).toBeDefined();

      const remarkedEvent = contractsClient.events.system.Remarked.find(result.events);
      assert(remarkedEvent, 'Remarked event should be emitted');
    });

    it('should get paymentInfo from Uint8Array via toTx', async () => {
      const unsignedTx = contractsClient.tx.balances.transferKeepAlive(bob.address, TEN_UNIT);
      const u8a = hexToU8a(unsignedTx.toHex());

      const submittable = contractsClient.toTx(u8a);
      const paymentInfo = await submittable.paymentInfo(alice.address);

      expect(paymentInfo).toBeDefined();
      expect(paymentInfo.partialFee).toBeGreaterThan(0n);
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

    it('should send tx from Uint8Array via toTx', async () => {
      const prevBobBalance = (await reviveClient.query.system.account(bob.address)).data.free;

      const signedTx = await reviveClient.tx.balances.transferKeepAlive(bob.address, TEN_UNIT).sign(alice);
      const u8a = hexToU8a(signedTx.toHex());

      const submittable = reviveClient.toTx(u8a);
      const result = await submittable.send().untilBestChainBlockIncluded();

      expect(result.status.type).toBe('BestChainBlockIncluded');
      expect(result.txHash).toBeDefined();

      const newBobBalance = (await reviveClient.query.system.account(bob.address)).data.free;
      expect(newBobBalance).toBe(prevBobBalance + TEN_UNIT);
    });

    it('should signAndSend IRuntimeTxCall via toTx', async () => {
      const prevBobBalance = (await reviveClient.query.system.account(bob.address)).data.free;

      const txCall = reviveClient.tx.balances.transferKeepAlive(bob.address, TEN_UNIT).call;

      const submittable = reviveClient.toTx(txCall);
      const result = await submittable.signAndSend(alice).untilBestChainBlockIncluded();

      expect(result.status.type).toBe('BestChainBlockIncluded');
      expect(result.txHash).toBeDefined();

      const newBobBalance = (await reviveClient.query.system.account(bob.address)).data.free;
      expect(newBobBalance).toBe(prevBobBalance + TEN_UNIT);
    });

    it('should signAndSend runtime call hex via toTx', async () => {
      const remarkMessage = 'Hello from toTx callHex V2 test';
      const callHex = reviveClient.tx.system.remarkWithEvent(remarkMessage).callHex;

      const submittable = reviveClient.toTx(callHex);
      const result = await submittable.signAndSend(alice).untilBestChainBlockIncluded();

      expect(result.status.type).toBe('BestChainBlockIncluded');
      expect(result.txHash).toBeDefined();

      const remarkedEvent = reviveClient.events.system.Remarked.find(result.events);
      assert(remarkedEvent, 'Remarked event should be emitted');
    });

    it('should signAndSend runtime call Uint8Array via toTx', async () => {
      const remarkMessage = 'Hello from toTx callU8a V2 test';
      const callU8a = reviveClient.tx.system.remarkWithEvent(remarkMessage).callU8a;

      const submittable = reviveClient.toTx(callU8a);
      const result = await submittable.signAndSend(alice).untilBestChainBlockIncluded();

      expect(result.status.type).toBe('BestChainBlockIncluded');
      expect(result.txHash).toBeDefined();

      const remarkedEvent = reviveClient.events.system.Remarked.find(result.events);
      assert(remarkedEvent, 'Remarked event should be emitted');
    });

    it('should get paymentInfo from Uint8Array via toTx', async () => {
      const unsignedTx = reviveClient.tx.balances.transferKeepAlive(bob.address, TEN_UNIT);
      const u8a = hexToU8a(unsignedTx.toHex());

      const submittable = reviveClient.toTx(u8a);
      const paymentInfo = await submittable.paymentInfo(alice.address);

      expect(paymentInfo).toBeDefined();
      expect(paymentInfo.partialFee).toBeGreaterThan(0n);
    });
  });
});
