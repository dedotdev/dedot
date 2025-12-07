# CLI

Dedot comes by default with a cli when you install [`dedot`](https://www.npmjs.com/package/dedot) package, you can access the cli typing `dedot` (or `djs`) in the terminal. `dedot` cli helps you generate Types & APIs to any Substrate-based chains or ink! smart contracts that you're working with. This enable Types & APIs suggetions/auto-completion via IntelliSense for any on-chain interactions.

### `dedot chaintypes`

Generate Types & APIs for a Substrated-based blockchain given its metadata. The cli can fetch metadata from a WebSocket endpoint, a wasm runtime file or a raw metadata (.scale) file.

Usage:

```bash
npx dedot chaintypes -w wss://rpc.polkadot.io
```

Options:

* `-w, --wsUrl`: Fetch metadata from a WebSocket endpoint
* `-r, --wasm`: Fetch metadata from a runtime wasm file (.wasm)
* `-m, --metadata`: Fetch metadata from [a raw metadata file](https://github.com/paritytech/subxt?tab=readme-ov-file#downloading-metadata-from-a-substrate-node) (.scale)
* `-o, --output`: Folder to put generated files
* `-c, --chain`: Customize the chain name to generate, default to [`runtimeVersion.specName`](https://github.com/paritytech/polkadot-sdk/blob/002d9260f9a0f844f87eefd0abce8bd95aae351b/substrate/primitives/version/src/lib.rs#L165)
* `-d, --dts`: Generate `.d.ts` files instead of `.ts`, default: `true`
* `-s, --subpath`: Using subpath packages (e.g: `dedot/types` instead of `@dedot/types`), default: `true`
* `-a, --at`: Block hash or block number to generate chaintypes at (requires `--wsUrl`)
* `-x, --specVersion`: Spec version to generate chaintypes at (requires `--wsUrl`)

#### Generate chaintypes at a specific block

You can generate chain types at a specific point in the chain history using the `--at` or `--specVersion` options. This is useful when you need types for a specific runtime version.

```bash
# Generate at a specific block hash
npx dedot chaintypes -w wss://rpc.polkadot.io -a 0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3

# Generate at a specific block number
npx dedot chaintypes -w wss://rpc.polkadot.io -a 12345678

# Generate at a specific spec version
npx dedot chaintypes -w wss://rpc.polkadot.io -x 1003000
```

{% hint style="info" %}
The `--at` and `--specVersion` options can only be used with `--wsUrl` and cannot be used together.
{% endhint %}

### `dedot typink`

Generate Types & APIs for an [ink!](https://use.ink/) or [Solidity](https://docs.soliditylang.org/en/latest/contracts.html) smart contract given its metadata/ABI.

Usage:

```bash
npx dedot typink -m ./path/to/metadata.json # or metadata.contract
```

Options:

* `-m, --metadata`: Path to contract metadata file (`.json`, `.contract`)
* `-o, --output`: Folder to put generated files
* `-c, --contract`: Custom contract name, default is contract name from metadata
* `-d, --dts`: Generate `.d.ts` files instead of `.ts`, default: `true`
* `-s, --subpath`: Using subpath packages (e.g: `dedot/types` instead of `@dedot/types`), default: `true`
