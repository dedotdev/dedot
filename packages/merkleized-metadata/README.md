# @dedot/merkleized-metadata

Merkleized Metadata Utilities - Implementing the [RFC-0078 Merkleized Metadata](https://polkadot-fellows.github.io/RFCs/approved/0078-merkleized-metadata.html) specification.

## Overview

This package provides utilities for:

- Calculate metadata hash/digest
- Generate proofs for extrinsic, extrinsic payload or extrinsic parts

## Usage

### Calculating Metadata Hash/Digest

```typescript
import { DedotClient, WsProvider } from 'dedot';
import { MerkleizedMetadata } from 'dedot/merkleized-metadata';

// Create a dedot client
const client = await DedotClient.new(new WsProvider('wss://rpc.polkadot.io'));

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

// Create a merkleizer instance
const merkleizer = new MerkleizedMetadata(metadata, chainInfo);

// Calculate metadata hash
const hash = merkleizer.digest();
console.log('Metadata Hash:', hash);
```

### Generating Proofs for Extrinsics

```typescript
import { MerkleizedMetadata } from 'dedot/merkleized-metadata';

// Create a merkleizer instance
const merkleizer = new MerkleizedMetadata(metadata, chainInfo);

// Generate proof for an extrinsic
const extrinsicHex = '0x...'; // Hex-encoded extrinsic
const proof = merkleizer.proofForExtrinsic(extrinsicHex);

// Generate proof for extrinsic payload
const txPayload = '0x...'; // Hex-encoded extrinsic payload
const proof3 = merkleizer.proofForExtrinsicPayload(txPayload);

// Generate proof for extrinsic parts
const callData = '0x...'; // Hex-encoded call data
const includedInExtrinsic = '0x...'; // Hex-encoded extrinsic extra
const includedInSignedData = '0x...'; // Hex-encoded signed extra
const proof2 = merkleizer.proofForExtrinsicParts(callData, includedInExtrinsic, includedInSignedData);
```

## `MerkleizedMetadata`

Main class for calculating metadata hashes and generating proofs.

- **Constructor**: `new MerkleizedMetadata(metadata, chainInfo)`
  - `metadata`: Metadata object, hex string, or Uint8Array
  - `chainInfo`: Chain-specific information (some fields can be omitted as they'll be fetched from metadata)

- **Methods**:
  - `digest()`: Calculate metadata hash and return as Uint8Array
  - `proofForExtrinsic(extrinsic, additionalSigned?)`: Generate proof for an extrinsic
  - `proofForExtrinsicPayload(txPayload)`: Generate proof for extrinsic payload
  - `proofForExtrinsicParts(callData, includedInExtrinsic, includedInSignedData)`: Generate proof for extrinsic parts

## License

Apache-2.0
