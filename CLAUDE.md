# Dedot Project Reference

## Project Overview

**Dedot** (formerly DelightfulDot) is a next-generation JavaScript/TypeScript client for Polkadot and Polkadot SDK-based blockchains. It's designed to provide a lightweight, tree-shakable, and type-safe development experience for building decentralized applications (dApps).

### Key Features
- Small bundle size with tree-shakable architecture (no bn.js or wasm-blob dependencies)
- Precise TypeScript types & API suggestions for individual blockchain networks
- Native TypeScript type system for scale-codec
- Compatible with @polkadot/extension-based wallets
- Support for Metadata V14, V15, V16
- Built-in metadata caching and optimization
- Support for light clients (e.g., smoldot)
- Fully-typed Contract APIs for ink! smart contracts

## Architecture & Key Packages

The project uses a monorepo structure managed by Lerna and Yarn workspaces:

### Core Packages

- **`@dedot/api`** - Main API client for interacting with blockchain networks
  - `DedotClient` - Primary client for new JSON-RPC APIs
  - `LegacyClient` - Support for legacy JSON-RPC APIs
  - Executors for constants, errors, events, storage queries, transactions, and runtime APIs
  
- **`@dedot/codecs`** - Scale codec implementations
  - Generic codecs (AccountId32, Hash, Header, etc.)
  - Known codec types for Substrate primitives
  - Metadata handling (V14, V15, V16)
  - Extrinsic encoding/decoding
  
- **`@dedot/types`** - TypeScript type definitions
  - JSON-RPC types (legacy and v2)
  - Runtime types
  - Event and extrinsic types
  
- **`@dedot/providers`** - Network connection providers
  - `WsProvider` - WebSocket provider
  - `SmoldotProvider` - Light client provider
  - Base subscription provider abstractions
  
- **`@dedot/contracts`** - ink! smart contract support
  - Contract deployment and interaction
  - Typed contract APIs
  - Storage abstractions (LazyMapping, LazyStorageVec)
  
- **`@dedot/shape`** - Shape/codec utilities
  - Deshaping utilities
  - Extension codecs (hex, array, object, etc.)
  - Lean implementations (Enum, Struct)
  
- **`@dedot/utils`** - Common utilities
  - Address encoding/decoding (SS58, EVM)
  - Hash functions (blake2, keccak, xxhash)
  - BigInt and number utilities
  - Event emitter
  - Queue implementations
  
- **`@dedot/cli`** - Command-line interface
  - Chain types generation
  - Typink contract types generation
  
- **`@dedot/codegen`** - Code generation utilities
  - Chain type generators
  - Contract type generators
  
- **`dedot`** - Main entry point package that re-exports all functionality

### Supporting Packages

- **`@dedot/storage`** - Storage interface implementations
- **`@dedot/runtime-specs`** - Runtime API specifications
- **`@dedot/merkleized-metadata`** - Merkleized metadata support
- **`@dedot/smoldot`** - Smoldot light client integration

## Development Workflow

### Setup
```bash
# Install dependencies
yarn install --immutable

# Build all packages
yarn build

# Run tests
yarn test
```

### Common Commands

- `yarn build` - Clean and build all packages
- `yarn test` - Run all unit tests
- `yarn prettify` - Format code with Prettier
- `yarn check-format` - Check code formatting
- `yarn cli` - Run the CLI tool
- `yarn gen:chaintypes-substrate` - Generate Substrate chain types

### Publishing

- `yarn publish:next` - Publish canary releases
- `yarn publish:pre` - Publish pre-releases

## Important Conventions & Patterns

### TypeScript Configuration
- Uses TypeScript 5.4.5 with strict mode enabled
- Monorepo references for efficient builds
- Path aliases configured in `tsconfig.base.json`
- Separate build configs for CJS and ESM outputs

### Code Style
- Prettier for formatting
- Import sorting via `@trivago/prettier-plugin-sort-imports`
- Husky for pre-commit hooks

### Package Structure
Each package follows a consistent structure:
```
packages/[name]/
├── src/           # Source files
├── package.json   # Package configuration
├── tsconfig.json  # TypeScript config
├── tsconfig.build.json  # Build config
└── README.md      # Package documentation
```

### API Design Patterns
- Executor pattern for different blockchain operations
- Abstract base classes for extensibility
- Lazy initialization for contract storage
- Event-driven architecture with typed events

## Testing Approach

### Unit Tests
- Uses Vitest as the test runner
- Happy-DOM environment for browser-like testing
- Test files colocated with source (`__tests__` directories)
- Extensive mocking for providers and network calls

### E2E Tests
- Two separate E2E test suites:
  - `e2e/contracts` - Contract interaction tests
  - `e2e/zombienet` - Full network integration tests
- Zombienet for spinning up test networks
- Docker support for consistent test environments

### Test Commands
```bash
# Run all tests
yarn test

# Run specific package tests
cd packages/api && yarn test

# Run E2E tests (requires setup)
cd e2e/contracts && yarn test
cd e2e/zombienet && yarn test
```

## Build Process

### Build Pipeline
1. **Clean** - Remove previous build artifacts
2. **TypeScript Compilation** - Compile to both CJS and ESM
3. **Path Fixing** - Fix ESM import paths
4. **File Copying** - Copy non-TS files to dist

### Build Outputs
- CommonJS modules for Node.js compatibility
- ES modules for modern bundlers
- TypeScript declarations
- Source maps for debugging

### Lerna Configuration
- Version: 0.13.1
- NPM client: Yarn
- Independent versioning for packages

## Key Technologies & Dependencies

### Core Dependencies
- **TypeScript** - Primary language
- **Lerna** - Monorepo management
- **Yarn 4** - Package manager with workspace support
- **Vitest** - Testing framework
- **Handlebars** - Template engine for code generation

### Blockchain-Specific
- Support for Substrate-based chains
- Polkadot/Kusama compatibility
- ink! smart contract support
- Scale codec implementation

### Development Tools
- **Prettier** - Code formatting
- **Husky** - Git hooks
- **TSX** - TypeScript execution
- **TypeDoc** - API documentation generation

## Special Notes & Considerations

### Migration from @polkadot/api
- Familiar API style for easy migration
- Type system improvements over @polkadot/api
- No heavy dependencies (bn.js, wasm)

### Performance Optimizations
- Tree-shaking support for smaller bundles
- Metadata caching to reduce network calls
- Efficient codec implementations

### Multi-Chain Support
- Designed for connecting to multiple chains simultaneously
- Chain-specific type generation via @dedot/chaintypes
- Runtime API discovery and typing

### Contract Development
- First-class support for ink! contracts
- Type-safe contract interactions
- Integration with Typink toolkit

### Community & Support
- Telegram channel: https://t.me/JoinDedot
- Documentation: https://dedot.dev
- Supported by Web3 Foundation Grants Program

### Real-World Usage
- Polkadot Live App
- Polkadot Staking Dashboard
- Typink development toolkit

## License

Apache-2.0