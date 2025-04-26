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
- Verify metadata proofs

## Usage

### Calculating Metadata Hash

```typescript
import { MerkleizedMetadata, ChainMetadataInfo } from '@dedot/merkleized-metadata';
import { DedotClient } from '@dedot/api';

// Create a dedot client
const client = await DedotClient.create('wss://rpc.polkadot.io');

// Get metadata from the client
const metadata = client.metadata;

// Define chain-specific information
const chainInfo: ChainMetadataInfo = {
  specVersion: client.runtimeVersion.specVersion,
  specName: client.runtimeVersion.specName,
  ss58Prefix: 0, // Polkadot
  decimals: 10,
  tokenSymbol: 'DOT'
};

// Create a calculator instance
const calculator = new MerkleizedMetadata(metadata, chainInfo);

// Calculate metadata hash
const result = calculator.calculateHash();
console.log('Metadata Hash:', result.hashHex);
```

### Using Utility Functions

```typescript
import { calculateMetadataHash, calculateMetadataHashHex, createMetadataDigest } from '@dedot/merkleized-metadata';

// Calculate metadata hash directly
const hashResult = calculateMetadataHash(metadata, chainInfo);

// Calculate metadata hash and return as hex string
const hashHex = calculateMetadataHashHex(metadata, chainInfo);

// Create metadata digest without calculating hash
const digest = createMetadataDigest(metadata, chainInfo);
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
const extrinsicExtra = '0x...'; // Hex-encoded extrinsic extra
const signedExtra = '0x...'; // Hex-encoded signed extra
const proof2 = calculator.proofForExtrinsicParts(callData, extrinsicExtra, signedExtra);
```

## API Reference

### Classes

- `MerkleizedMetadata` - Main class for calculating metadata hashes and generating proofs

### Functions

- `calculateMetadataHash` - Calculate metadata hash from metadata and chain info
- `calculateMetadataHashHex` - Calculate metadata hash and return as hex string
- `createMetadataDigest` - Create metadata digest from metadata and chain info
- `buildMerkleTree` - Build a merkle tree from leaves
- `generateProof` - Generate proof for specific type information

### Types

- `ChainMetadataInfo` - Chain-specific information required for metadata hash calculation
- `MetadataDigest` - Metadata digest structure
- `MetadataHashResult` - Result of metadata hash calculation
- `MetadataProof` - Proof for metadata verification

## License

Apache-2.0
