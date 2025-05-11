# @dedot/merkleized-metadata

Merkleized metadata utility for dedot, implementing the [RFC-0078 Merkleized Metadata](https://polkadot-fellows.github.io/RFCs/approved/0078-merkleized-metadata.html) specification.

## Installation

```bash
# Using yarn
yarn add @dedot/merkleized-metadata

# Using npm
npm install @dedot/merkleized-metadata
```

## Overview

This package provides utilities for calculating metadata hashes according to the RFC-0078 Merkleized Metadata specification. It allows you to:

- Calculate metadata hashes for runtime metadata
- Generate proofs for extrinsics

The package is organized into a modular structure:
- Core functionality in the main `MerkleizedMetadata` class
- Merkle tree operations in the `merkle` module
- Metadata transformation utilities in the `transform` module

## Usage

### Calculating Metadata Hash

```typescript
import { MerkleizedMetadata } from '@dedot/merkleized-metadata';
import { DedotClient } from '@dedot/api';

// Create a dedot client
const client = await DedotClient.create('wss://rpc.polkadot.io');

// Get metadata from the client
const metadata = client.metadata;

// Define chain-specific information
const chainInfo = {
  // These can be omitted as they'll be fetched from metadata
  // specVersion: client.runtimeVersion.specVersion,
  // specName: client.runtimeVersion.specName,
  // ss58Prefix: 0, // Polkadot
  
  // These are required
  decimals: 10,
  tokenSymbol: 'DOT'
};

// Create a calculator instance
const calculator = new MerkleizedMetadata(metadata, chainInfo);

// Calculate metadata hash
const hash = calculator.digest();
console.log('Metadata Hash:', hash);
```

### Generating Proofs for Extrinsics

```typescript
import { MerkleizedMetadata } from '@dedot/merkleized-metadata';

// Create a calculator instance
const calculator = new MerkleizedMetadata(metadata, chainInfo);

// Generate proof for an extrinsic
const extrinsicHex = '0x...'; // Hex-encoded extrinsic
const proof = calculator.proofForExtrinsic(extrinsicHex);

// Generate proof for extrinsic parts
const callData = '0x...'; // Hex-encoded call data
const includedInExtrinsic = '0x...'; // Hex-encoded extrinsic extra
const includedInSignedData = '0x...'; // Hex-encoded signed extra
const proof2 = calculator.proofForExtrinsicParts(callData, includedInExtrinsic, includedInSignedData);

// Generate proof for extrinsic payload
const txPayload = '0x...'; // Hex-encoded transaction payload
const proof3 = calculator.proofForExtrinsicPayload(txPayload);
```

### Using Merkle Tree Utilities Directly

```typescript
import { buildMerkleTree, generateProof } from '@dedot/merkleized-metadata';

// Build a Merkle tree from leaves
const leaves = [new Uint8Array([1, 2, 3]), new Uint8Array([4, 5, 6])];
const tree = buildMerkleTree(leaves);
const rootHash = tree[0];

// Generate proof for specific leaves
const indices = [0]; // Generate proof for the first leaf
const proof = generateProof(leaves, indices);
```

## API Reference

### Classes

#### `MerkleizedMetadata`

Main class for calculating metadata hashes and generating proofs.

- **Constructor**: `new MerkleizedMetadata(metadata, chainInfo)`
  - `metadata`: Metadata object, hex string, or Uint8Array
  - `chainInfo`: Chain-specific information (some fields can be omitted as they'll be fetched from metadata)

- **Methods**:
  - `digest()`: Calculate metadata hash and return as Uint8Array
  - `proofForExtrinsic(extrinsic, additionalSigned?)`: Generate proof for an extrinsic
  - `proofForExtrinsicParts(callData, includedInExtrinsic, includedInSignedData)`: Generate proof for extrinsic parts
  - `proofForExtrinsicPayload(txPayload)`: Generate proof for extrinsic payload

### Merkle Module Functions

- `buildMerkleTree(leaves)`: Build a Merkle tree from leaves
- `generateProof(leaves, indices)`: Generate proof for specific leaf indices

### Types

- `ChainInfo`: Chain-specific information required for metadata hash calculation
  - `specVersion`: Runtime spec version
  - `specName`: Runtime spec name
  - `ss58Prefix`: SS58 address format prefix
  - `decimals`: Token decimal places
  - `tokenSymbol`: Token symbol

- `ChainInfoOptional`: Same as `ChainInfo` but with some fields optional
  - `specVersion?`: Optional runtime spec version
  - `specName?`: Optional runtime spec name
  - `ss58Prefix?`: Optional SS58 address format prefix
  - `decimals`: Required token decimal places
  - `tokenSymbol`: Required token symbol

## License

Apache-2.0
