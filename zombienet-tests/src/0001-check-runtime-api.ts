import { Dedot } from 'dedot';
import { assert } from '@dedot/utils';
import { stringCamelCase } from '@polkadot/util';
import { $Metadata, Metadata } from '@dedot/codecs';

export const run = async (nodeName: any, networkInfo: any) => {
  const { wsUri } = networkInfo.nodesByName[nodeName];

  const api = await Dedot.new(wsUri);

  assert(api.metadata.version === 'V15', 'Metadata should be V15');

  // Checking if all apis specs are defined
  api.metadataLatest.apis.forEach(({ name, methods }) => {
    methods.forEach((method) => {
      const runtimeApi = stringCamelCase(name);
      const methodName = stringCamelCase(method.name);

      const call = api.call[runtimeApi][methodName];
      assert(typeof call === 'function', `Runtime call ${runtimeApi}.${methodName} should be a function`);
      assert(call.meta, `Metadata for runtime call ${runtimeApi}.${methodName} should be available`);
    });
  });

  // Try a few examples
  const version = await api.call.core.version();
  assert(version.specName === 'rococo', 'Incorrect spec name');
  console.log('Runtime version', version);

  const metadataVersions = await api.call.metadata.metadataVersions();
  assert(metadataVersions.includes(15), 'Should support metadata v15');
  console.log('Supported metadata versions', metadataVersions);

  const encodedMetadata = await api.call.metadata.metadataAtVersion(15);
  const metadata = $Metadata.tryDecode(encodedMetadata);
  assert(metadata instanceof Metadata, 'Invalid metadata instance');
};
