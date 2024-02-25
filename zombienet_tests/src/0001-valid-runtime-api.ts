import { DelightfulApi } from 'delightfuldot';
import { $Metadata } from '@delightfuldot/codecs';

export const run = async (nodeName: any, networkInfo: any) => {
  const { wsUri } = networkInfo.nodesByName[nodeName];

  const api = await DelightfulApi.create(wsUri);

  const version = await api.call.core.version();
  console.log('Version', version);

  const metadataVersions = await api.call.metadata.metadataVersions();
  console.log('Metadata versions support', metadataVersions);

  const encodedMetadata = await api.call.metadata.metadataAtVersion(15);
  const metadata = $Metadata.tryDecode(encodedMetadata);

  // Checking if all apis specs are defined
  metadata.latest.apis.forEach(({ name, methods }) => {
    methods.forEach((method) => api.call[name][method.name]);
  });
};
