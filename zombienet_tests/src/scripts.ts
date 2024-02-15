import { DelightfulApi } from 'delightfuldot';

export const run = async (nodeName: any, networkInfo: any) => {
  console.log('nodeName', nodeName);
  console.log('networkInfo', networkInfo);

  const { wsUri } = networkInfo.nodesByName[nodeName];

  const api = await DelightfulApi.create(wsUri);
  const validator = await api.query.session.validators();
  console.log('validator.length', validator.length);
  return validator.length;
};
