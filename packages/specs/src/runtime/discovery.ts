import { RuntimeApisModule } from '@delightfuldot/types';

export const discovery: RuntimeApisModule = {
  AuthorityDiscoveryApi: [
    {
      methods: {
        authorities: {
          docs: 'Retrieve authority identifiers of the current and next authority set.',
          params: [],
          type: 'Array<AccountId32>',
        },
      },
      version: 1,
    },
  ],
};
