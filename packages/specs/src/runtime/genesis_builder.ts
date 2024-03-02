import { RuntimeApiSpec } from '@dedot/types';

/**
 * Ref: https://github.com/paritytech/polkadot-sdk/blob/9a5d9a586e5a1c27bf29d3727b5edc89c59f0398/substrate/primitives/genesis-builder/src/lib.rs#L35-L45
 */
export const GenesisBuilder: RuntimeApiSpec[] = [
  {
    methods: {
      createDefaultConfig: {
        docs: [
          'Creates the default `GenesisConfig` and returns it as a JSON blob.',
          '\n',
          'This function instantiates the default `GenesisConfig` struct for the runtime and serializes it into a JSON',
          'blob. It returns a `Vec<u8>` containing the JSON representation of the default `GenesisConfig`.',
        ],
        params: [],
        type: 'Bytes',
      },
      buildConfig: {
        docs: [
          'Build `GenesisConfig` from a JSON blob not using any defaults and store it in the storage.',
          '\n',
          'This function deserializes the full `GenesisConfig` from the given JSON blob and puts it into the storage.',
          'If the provided JSON blob is incorrect or incomplete or the deserialization fails, an error is returned.',
          'It is recommended to log any errors encountered during the process.',
          '\n',
          'Please note that provided json blob must contain all `GenesisConfig` fields, no defaults will be used.',
        ],
        params: [
          {
            name: 'json',
            type: 'Bytes',
          },
        ],
        type: 'Result<[], Text>',
      },
    },
    version: 1,
  },
];
