import { generateContractTypesFromMetadata } from './gen';
import { Dedot } from 'dedot';
import { ContractPromise } from './exec/ContractPromise';
import { Motherspace } from './typesgen/motherspace';

(async () => {
  // await generateContractTypesFromMetadata();
  // const contractAddress = '5FRVA9p6ov896DR99FCXvnogXBEhb68BFQtMKpYXmCqP558X';
  // const api = await Dedot.create('ws://127.0.0.1:9944');
  // const contract = new ContractPromise<Motherspace>(api, contractAddress, metadata);
  // const alicePair = new Keyring({ type: 'sr25519' }).addFromUri('//Alice');
  //
  // const { result } = await contract.query.registerPluginLauncher(
  //   stringToHex('POLL'),
  //   u8aToHex(decodeAddress(contractAddress)),
  // );
  //
  // const txResult = await contract.tx
  //   .registerPluginLauncher(
  //     stringToHex('POST'),
  //     u8aToHex(decodeAddress(contractAddress)),
  //     new AccountId32(contractAddress),
  //     {
  //       value: 1000000000000n,
  //       gasLimit: result.gasConsumed,
  //       storageDepositLimit: 1000000000000n,
  //     },
  //   )
  //   .signAndSend(alicePair);
})();
