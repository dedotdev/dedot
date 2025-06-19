ARG NODE_VERSION=18.14.2

FROM node:${NODE_VERSION} as base
WORKDIR /usr/dedot
COPY . .
WORKDIR /usr/bin
RUN \
    curl -L -O https://github.com/paritytech/zombienet/releases/download/v1.3.102/zombienet-linux-x64 && chmod +x zombienet-linux-x64 \
    && curl -L -O https://github.com/paritytech/polkadot-sdk/releases/download/polkadot-v1.7.0/polkadot && chmod +x polkadot \
    && curl -L -O https://github.com/paritytech/polkadot-sdk/releases/download/polkadot-v1.7.0/polkadot-execute-worker && chmod +x polkadot-execute-worker \
    && curl -L -O https://github.com/paritytech/polkadot-sdk/releases/download/polkadot-v1.7.0/polkadot-prepare-worker && chmod +x polkadot-prepare-worker \
    && curl -L -O https://github.com/paritytech/polkadot-sdk/releases/download/polkadot-v1.7.0/polkadot-parachain && chmod +x polkadot-parachain

FROM base as test
WORKDIR /usr/dedot
RUN yarn install --immutable
RUN yarn build
RUN yarn zombienet-test-preps
RUN zombienet-linux-x64 -p native test ./e2e/zombienet/src/0001-small-network-batch-01.zndsl
RUN zombienet-linux-x64 -p native test ./e2e/zombienet/src/0001-small-network-batch-02.zndsl
