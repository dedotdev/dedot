import { describe, expect, it } from 'vitest';
import { devPairs } from '../utils.js';

describe('Mortality', () => {
  const { alice, bob } = devPairs();
  const TEN_UNIT = BigInt(10 * 1e12);

  describe('LegacyClient (Contracts)', () => {
    it('should send immortal transaction', async () => {
      const prevBobBalance = (await contractsClient.query.system.account(bob.address)).data.free;

      const result = await contractsClient.tx.balances
        .transferKeepAlive(bob.address, TEN_UNIT)
        .signAndSend(alice, { mortality: { type: 'Immortal' } })
        .untilFinalized();

      expect(result.status.type).toBe('Finalized');
      expect(result.txHash).toBeDefined();

      const newBobBalance = (await contractsClient.query.system.account(bob.address)).data.free;
      expect(newBobBalance).toBe(prevBobBalance + TEN_UNIT);
    });

    it('should send transaction with custom mortal period', async () => {
      const prevBobBalance = (await contractsClient.query.system.account(bob.address)).data.free;

      const result = await contractsClient.tx.balances
        .transferKeepAlive(bob.address, TEN_UNIT)
        .signAndSend(alice, { mortality: { type: 'Mortal', period: 128 } })
        .untilFinalized();

      expect(result.status.type).toBe('Finalized');
      expect(result.txHash).toBeDefined();

      const newBobBalance = (await contractsClient.query.system.account(bob.address)).data.free;
      expect(newBobBalance).toBe(prevBobBalance + TEN_UNIT);
    });
  });

  describe('V2Client (Revive)', () => {
    it('should send immortal transaction', async () => {
      const prevBobBalance = (await reviveClient.query.system.account(bob.address)).data.free;

      const result = await reviveClient.tx.balances
        .transferKeepAlive(bob.address, TEN_UNIT)
        .signAndSend(alice, { mortality: { type: 'Immortal' } })
        .untilBestChainBlockIncluded();

      expect(result.status.type).toBe('BestChainBlockIncluded');
      expect(result.txHash).toBeDefined();

      const newBobBalance = (await reviveClient.query.system.account(bob.address)).data.free;
      expect(newBobBalance).toBe(prevBobBalance + TEN_UNIT);
    });

    it('should send transaction with custom mortal period', async () => {
      const prevBobBalance = (await reviveClient.query.system.account(bob.address)).data.free;

      const result = await reviveClient.tx.balances
        .transferKeepAlive(bob.address, TEN_UNIT)
        .signAndSend(alice, { mortality: { type: 'Mortal', period: 128 } })
        .untilBestChainBlockIncluded();

      expect(result.status.type).toBe('BestChainBlockIncluded');
      expect(result.txHash).toBeDefined();

      const newBobBalance = (await reviveClient.query.system.account(bob.address)).data.free;
      expect(newBobBalance).toBe(prevBobBalance + TEN_UNIT);
    });
  });
});
