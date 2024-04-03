export type SubscribeMethod = string;
export type UnsubscribeMethod = string;
export type NotificationMethod = string;
export type SubscriptionsInfo = Record<SubscribeMethod, [NotificationMethod, UnsubscribeMethod]>;

export const subscriptionsInfo: SubscriptionsInfo = {
  author_submitAndWatchExtrinsic: ['author_extrinsicUpdate', 'author_unwatchExtrinsic'],
  state_subscribeRuntimeVersion: ['state_runtimeVersion', 'state_unsubscribeRuntimeVersion'],
  state_subscribeStorage: ['state_storage', 'state_unsubscribeStorage'],
  chain_subscribeAllHeads: ['chain_allHead', 'chain_unsubscribeAllHeads'],
  chain_subscribeNewHeads: ['chain_newHead', 'chain_unsubscribeNewHeads'],
  chain_subscribeFinalizedHeads: ['chain_finalizedHead', 'chain_unsubscribeFinalizedHeads'],
  grandpa_subscribeJustifications: ['grandpa_justifications', 'grandpa_unsubscribeJustifications'],
  beefy_subscribeJustifications: ['beefy_justifications', 'beefy_unsubscribeJustifications'],
};
