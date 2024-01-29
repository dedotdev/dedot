import { RuntimeApisModule } from '@delightfuldot/types';

export const mixnet: RuntimeApisModule = {
  MixnetApi: [
    {
      methods: {
        sessionStatus: {
          dosc: 'Get the index and phase of the current session.',
          params: [],
          type: 'SessionStatus',
        },
        prevMixnodes: {
          docs: 'Get the mixnode set for the previous session.',
          params: [],
          type: 'ResultPayload<Array<Mixnode>, MixnodesErr>',
        },
        currentMixnodes: {
          docs: 'Get the mixnode set for the current session.',
          params: [],
          type: 'ResultPayload<Array<Mixnode>, MixnodesErr>',
        },
        maybeRegister: {
          docs: 'Try to register a mixnode for the next session.',
          params: [
            {
              name: 'sessionIndex',
              type: 'MixnetSessionIndex',
            },
            {
              name: 'mixnode',
              type: 'Mixnode',
            },
          ],
          type: 'bool',
        },
      },
      version: 1,
    },
  ],
};
