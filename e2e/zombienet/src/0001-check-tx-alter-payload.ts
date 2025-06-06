import Keyring from '@polkadot/keyring';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import { $, LegacyClient, WsProvider } from 'dedot';
import { ExtrinsicSignature } from 'dedot/codecs';
import { InjectedSigner, SignerPayloadJSON, SignerResult } from 'dedot/types';
import { assert, u8aToHex } from 'dedot/utils';

export const run = async (nodeName: any, networkInfo: any): Promise<void> => {
  await cryptoWaitReady();
  const keyring = new Keyring({ type: 'sr25519' });
  const alice = keyring.addFromUri('//Alice');

  const { wsUri } = networkInfo.nodesByName[nodeName];

  const api = await LegacyClient.new(new WsProvider(wsUri));
  const tip = 1_000n;

  const alterSigner = {
    signPayload: async (payload: SignerPayloadJSON): Promise<SignerResult> => {
      assert(payload.withSignedTransaction, 'withSignedTransaction should be true');

      // Changing the payload to add some tip
      // So we should expect the tip should be presence where the original tx does not have
      // Proving that the original tx payload is already alter to add the tip
      const transferTx = await api.tx.system.remarkWithEvent('Hello Dedot').sign(alice, { tip });

      const { addressTypeId, signatureTypeId } = api.registry.metadata!.extrinsic;

      const $Address = api.registry.findCodec<any>(addressTypeId);
      const $Signature = api.registry.findCodec<any>(signatureTypeId);
      const $Extra = api.registry.$Extra();

      const $ExtrinsicSignature: $.Shape<ExtrinsicSignature> = $.Struct({
        address: $Address,
        signature: $Signature,
        extra: $Extra,
      });

      return {
        id: Date.now(),
        signature: u8aToHex($ExtrinsicSignature.tryEncode(transferTx.signature)),
        signedTransaction: transferTx.toHex(),
      };
    },
  };

  const verifySigner = async (signer?: InjectedSigner) => {
    const remarkWithEventTx = await api.tx.system.remarkWithEvent('Hello Dedot').sign(alice.address, { signer });

    assert(remarkWithEventTx.signature, 'Tx signature should be available');

    const { events } = await remarkWithEventTx
      .send(({ status }) => {
        console.log('Transaction status', status.type);
      })
      .untilFinalized();

    const remarkEvent = api.events.system.Remarked.find(events);
    const txFreePaidEvent = api.events.transactionPayment.TransactionFeePaid.find(events);

    assert(
      remarkEvent && remarkEvent.pallet === 'System' && remarkEvent.palletEvent.name === 'Remarked',
      'System.Remarked event should be emitted',
    );

    assert(txFreePaidEvent && txFreePaidEvent.palletEvent.data.tip === tip, 'Tip value is not correct');
  };

  // sign tx via custom signer option
  await verifySigner(alterSigner);

  // sign tx via global signer via ApiOptions
  api.setSigner(alterSigner);
  await verifySigner();
};
