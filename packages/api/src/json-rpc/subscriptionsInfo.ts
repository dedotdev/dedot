import { SubscriptionsInfo } from '../public-types.js';

export const subscriptionsInfo: SubscriptionsInfo = {
  author_submitAndWatchExtrinsic: ['author_extrinsicUpdate', 'author_unwatchExtrinsic'],
  state_subscribeRuntimeVersion: ['state_runtimeVersion', 'state_unsubscribeRuntimeVersion'],
  state_subscribeStorage: ['state_storage', 'state_unsubscribeStorage'],
  chain_subscribeAllHeads: ['chain_allHead', 'chain_unsubscribeAllHeads'],
  chain_subscribeNewHeads: ['chain_newHead', 'chain_unsubscribeNewHeads'],
  chain_subscribeFinalizedHeads: ['chain_finalizedHead', 'chain_unsubscribeFinalizedHeads'],
  grandpa_subscribeJustifications: ['grandpa_justifications', 'grandpa_unsubscribeJustifications'],
  beefy_subscribeJustifications: ['beefy_justifications', 'beefy_unsubscribeJustifications'],
  chainHead_unstable_follow: ['chainHead_unstable_followEvent', 'chainHead_unstable_unfollow'],
  chainHead_v1_follow: ['chainHead_v1_followEvent', 'chainHead_v1_unfollow'],
  transactionWatch_unstable_submitAndWatch: [
    'transactionWatch_unstable_watchEvent',
    'transactionWatch_unstable_unwatch',
  ],
  transactionWatch_v1_submitAndWatch: ['transactionWatch_v1_watchEvent', 'transactionWatch_v1_unwatch'],
};
