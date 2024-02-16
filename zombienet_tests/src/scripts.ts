import { DelightfulApi } from 'delightfuldot';
import { $Metadata } from '@delightfuldot/codecs';

export const run = async (nodeName: any, networkInfo: any) => {
  console.log('nodeName', nodeName);
  console.log('networkInfo', networkInfo);

  const { wsUri } = networkInfo.nodesByName[nodeName];

  const api = await DelightfulApi.create(wsUri);

  const _version = await api.call.core.version();
  const _metadataVersions = await api.call.metadata.metadataVersions();
  const encodedMetadata = await api.call.metadata.metadataAtVersion(15);

  const metadata = $Metadata.tryDecode(encodedMetadata);
  metadata.latest.apis.forEach(({ name, methods }) => {
    methods.forEach((method) => api.call[name][method.name]);
  });
};
