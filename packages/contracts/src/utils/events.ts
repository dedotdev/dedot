/**
 * Pick the `Instantiated` event of the contract that was deployed directly by the signer.
 *
 * A single deployment can emit more than one `Instantiated` event: if the constructor
 * instantiates other contracts, each of them emits its own event, and those are emitted
 * *before* the event of the contract being deployed (the nested instantiation finishes first).
 *
 * To resolve the right one, we:
 * 1. prefer the last event whose deployer is the signer of the transaction,
 * 2. otherwise fall back to the last event, which belongs to the outermost instantiation.
 *
 * @param events all `Instantiated` events of the deployment, in the order they were emitted
 * @param isDeployedBySigner whether an event was emitted for a contract deployed directly by the signer
 */
export function pickInstantiatedEvent<E>(events: E[], isDeployedBySigner: (event: E) => boolean): E | undefined {
  if (!events || events.length === 0) return undefined;

  for (let idx = events.length - 1; idx >= 0; idx -= 1) {
    try {
      if (isDeployedBySigner(events[idx])) return events[idx];
    } catch {}
  }

  return events[events.length - 1];
}
