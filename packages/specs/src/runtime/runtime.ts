import { RuntimeApis, RuntimeApisModule } from '@delightfuldot/types';

const V1_TO_V4_SHARED: RuntimeApis = {
  executeBlock: {
    docs: 'Execute the given block.',
    params: [
      {
        name: 'block',
        type: 'Block',
      },
    ],
    type: 'null',
  },
};

const V1_V2_SHARED: RuntimeApis = {
  version: {
    docs: 'Returns the version of the runtime.',
    params: [],
    type: 'RuntimeVersionPre3',
  },
};

const V2_TO_V4_SHARED: RuntimeApis = {
  initializeBlock: {
    docs: 'Initialize a block with the given header.',
    params: [
      {
        name: 'header',
        type: 'Header',
      },
    ],
    type: 'null',
  },
};

export const runtime: RuntimeApisModule = {
  Core: [
    {
      methods: {
        version: {
          docs: 'Returns the version of the runtime.',
          params: [],
          type: 'RuntimeVersion',
        },
        ...V1_TO_V4_SHARED,
        ...V2_TO_V4_SHARED,
      },
      version: 4,
    },
    {
      methods: {
        version: {
          docs: 'Returns the version of the runtime.',
          params: [],
          type: 'RuntimeVersionPre4',
        },
        ...V1_TO_V4_SHARED,
        ...V2_TO_V4_SHARED,
      },
      version: 3,
    },
    {
      methods: {
        ...V1_V2_SHARED,
        ...V1_TO_V4_SHARED,
        ...V2_TO_V4_SHARED,
      },
      version: 2,
    },
    {
      methods: {
        initialiseBlock: {
          docs: 'Initialize a block with the given header.',
          params: [
            {
              name: 'header',
              type: 'Header',
            },
          ],
          type: 'null',
        },
        ...V1_V2_SHARED,
        ...V1_TO_V4_SHARED,
      },
      version: 1,
    },
  ],
};
