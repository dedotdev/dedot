import { Dedot } from 'dedot';
import { $Metadata } from '@dedot/codecs';
import { assert } from '@dedot/utils';

export const run = async (nodeName: any, networkInfo: any) => {
  const { wsUri } = networkInfo.nodesByName[nodeName];

  const api = await Dedot.new(wsUri);

  const version = await api.call.core.version();
  console.log('RuntimeVersion', version);

  const metadataVersions = await api.call.metadata.metadataVersions();
  console.log('Supported metadata versions', metadataVersions);

  const encodedMetadata = await api.call.metadata.metadataAtVersion(15);
  const metadata = $Metadata.tryDecode(encodedMetadata);

  // Checking if all apis specs are defined
  metadata.latest.apis.forEach(({ name, methods }) => {
    methods.forEach((method) => {
      const call = api.call[name][method.name];
      assert(typeof call === 'function', `Runtime call ${name}.${method.name} should be a function`);
      assert(call.meta, `Metadata for runtime call ${name}.${method.name} should be available`);
    });
  });
};
