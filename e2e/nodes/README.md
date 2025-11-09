# e2e-nodes

### Download the node binaries

Download the both `ink-node` and `substrate-contract-node` to your local environment:
- [ink-node](https://github.com/use-ink/ink-node/releases/tag/v0.43.3)
- [substrate-contracts-node](https://github.com/paritytech/substrate-contracts-node/releases/tag/v0.42.0)

### Run both nodes at 2 different port

```shell
# cd to the download folder

# run ink-node at port 9955
./ink-node --dev --rpc-port=9955 --state-pruning=archive --blocks-pruning=archive & 

# run substrate-contracts-node at port 9944
./substrate-contracts-node --dev --rpc-port=9944 &
```

### Run the tests

After getting both node running, we can run the e2e tests by running the following command:

```shell
yarn workspace e2e-nodes run e2e:test
```
