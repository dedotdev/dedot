import { Contract } from '@dedot/contracts';
import { assert } from '@dedot/utils';
import { beforeEach, describe, expect, it } from 'vitest';
import { FlipperContractApi } from '../contracts/flipper';
import { devPairs, flipperV5Metadata, flipperV6Metadata, deployFlipperV5, deployFlipperV6 } from '../utils.js';

describe('Contract', () => {
  let contract: Contract<FlipperContractApi>;
  let alicePair = devPairs().alice;

  describe('Contracts', () => {
    beforeEach(async () => {
      const contractAddress = await deployFlipperV5(alicePair);
      contract = new Contract<FlipperContractApi>(contractsClient, flipperV5Metadata, contractAddress, {
        defaultCaller: alicePair.address,
      });
    });

    it('events utils should work properly', async () => {
      const { raw } = await contract.query.flip();

      const { events: newEvents } = await contract.tx
        .flip({ gasLimit: raw.gasRequired })
        .signAndSend(alicePair)
        .untilFinalized();

      const flippedEvent1 = contract.events.Flipped.find(newEvents);
      const flippedEvents1 = contract.events.Flipped.filter(newEvents);

      const contractEvents = contract.decodeEvents(newEvents);
      const flippedEvents2 = contract.events.Flipped.filter(contractEvents);

      const flippedEvent2 = contract.events.Flipped.find(contractEvents);
      const flippedEvent3 = contractEvents.find(contract.events.Flipped.is);
      const flippedEvent4 = contract.decodeEvent(newEvents.find(contract.events.Flipped.is)!);

      assert(
        JSON.stringify(flippedEvent1) === JSON.stringify(flippedEvent2), // prettier-end-here
        'Incorrect flipped event 2',
      );
      assert(
        JSON.stringify(flippedEvent1) === JSON.stringify(flippedEvent3), // prettier-end-here
        'Incorrect flipped event 3',
      );
      assert(
        JSON.stringify(flippedEvent1) === JSON.stringify(flippedEvent4), // prettier-end-here
        'Incorrect flipped event 4',
      );
      assert(
        JSON.stringify([flippedEvent1]) === JSON.stringify(flippedEvents1), // prettier-end-here
        'Incorrect flipped event filter 1',
      );
      assert(
        JSON.stringify(flippedEvents2) === JSON.stringify(flippedEvents1), // prettier-end-here
        'Incorrect flipped event filter 2',
      );

      assert(flippedEvent1, 'Flipped event should be emitted');
      assert(flippedEvent1.data.new === false, 'New value should be false');
      assert(flippedEvent1.data.old === true, 'Old value should be true');
    });

    it('should watch events properly', async () => {
      const flippedPromise = new Promise<boolean>(async (resolve) => {
        const unsub = await contract.events.Flipped.watch((events) => {
          events.forEach((event) => {
            console.log('Coin flipped!');
            console.log('New state:', event.data.new);

            unsub();
            resolve(true);
          });
        });
      });

      const { raw } = await contract.query.flip();
      await contract.tx.flip({ gasLimit: raw.gasRequired }).signAndSend(alicePair).untilFinalized();

      expect(await flippedPromise).toBe(true);
    });
  });

  describe('Revive', () => {
    beforeEach(async () => {
      const contractAddress = await deployFlipperV6(alicePair);
      contract = new Contract<FlipperContractApi>(reviveClient, flipperV6Metadata, contractAddress, {
        defaultCaller: alicePair.address,
      });
    });

    it('events utils should work properly', async () => {
      const { raw } = await contract.query.flip();

      const { events: newEvents } = await contract.tx
        .flip({ gasLimit: raw.gasRequired })
        .signAndSend(alicePair)
        .untilFinalized();

      const flippedEvent1 = contract.events.Flipped.find(newEvents);
      const flippedEvents1 = contract.events.Flipped.filter(newEvents);

      const contractEvents = contract.decodeEvents(newEvents);
      const flippedEvents2 = contract.events.Flipped.filter(contractEvents);

      const flippedEvent2 = contract.events.Flipped.find(contractEvents);
      const flippedEvent3 = contractEvents.find(contract.events.Flipped.is);
      const flippedEvent4 = contract.decodeEvent(newEvents.find(contract.events.Flipped.is)!);

      assert(
        JSON.stringify(flippedEvent1) === JSON.stringify(flippedEvent2), // prettier-end-here
        'Incorrect flipped event 2',
      );
      assert(
        JSON.stringify(flippedEvent1) === JSON.stringify(flippedEvent3), // prettier-end-here
        'Incorrect flipped event 3',
      );
      assert(
        JSON.stringify(flippedEvent1) === JSON.stringify(flippedEvent4), // prettier-end-here
        'Incorrect flipped event 4',
      );
      assert(
        JSON.stringify([flippedEvent1]) === JSON.stringify(flippedEvents1), // prettier-end-here
        'Incorrect flipped event filter 1',
      );
      assert(
        JSON.stringify(flippedEvents2) === JSON.stringify(flippedEvents1), // prettier-end-here
        'Incorrect flipped event filter 2',
      );

      assert(flippedEvent1, 'Flipped event should be emitted');
      assert(flippedEvent1.data.new === false, 'New value should be false');
      assert(flippedEvent1.data.old === true, 'Old value should be true');
    });

    it('should watch events properly', async () => {
      const flippedPromise = new Promise<boolean>(async (resolve) => {
        const unsub = await contract.events.Flipped.watch((events) => {
          events.forEach((event) => {
            console.log('Coin flipped!');
            console.log('New state:', event.data.new);

            unsub();
            resolve(true);
          });
        });
      });

      const { raw } = await contract.query.flip();
      await contract.tx.flip({ gasLimit: raw.gasRequired }).signAndSend(alicePair).untilFinalized();

      expect(await flippedPromise).toBe(true);
    });
  });
});
