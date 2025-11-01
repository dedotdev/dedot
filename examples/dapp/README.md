# Example Dapp

This example demonstrates how to:
- Connect to Paseo testnet using DedotClient
- Detect and connect to any Polkadot wallet extension via `window.injectedWeb3`
- Submit a `system.remark` transaction using wallet signer
- Track transaction status (Validated → Broadcasting → BestChainBlockIncluded → Finalized)
- View transactions on Subscan block explorer

## Prerequisites

- A Polkadot wallet extension installed in your browser:
  - [Talisman](https://www.talisman.xyz/)
  - [Subwallet](https://www.subwallet.app/)
  - [Polkadot.js Extension](https://polkadot.js.org/extension/)
  - Or any other compatible wallet
- At least one account in your wallet

## Running the Application

Start the application by running:
```shell
# From examples/dapp folder
yarn dev

# From the project root folder
yarn workspace dapp dev
```

## Usage

1. Open the application in your browser (usually http://localhost:5173)
2. Wait for the network connection to establish
3. Select a wallet from the available detected wallets
4. Approve the connection in your wallet popup
5. Select an account from the dropdown
6. Enter a remark message
7. Click "Submit Remark" and approve the transaction in your wallet
8. Watch the transaction status update in real-time
9. Click the Subscan link to view your transaction on the block explorer
