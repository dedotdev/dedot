import type { IEventRecord, PalletEvent } from '@dedot/types';

/**
 * Checks if the provided object is a valid `PalletEvent`.
 *
 * @param event - The object to be checked.
 * @returns `true` if the object is a valid `PalletEvent`, `false` otherwise.
 *
 * @remarks
 * A `PalletEvent` is expected to have the following properties:
 * - `pallet`: A string representing the name of the pallet associated with the event.
 * - `palletEvent`: An object or string representing the details of the pallet event.
 *
 * This function validates the presence and type of these properties in the provided object.
 */
export const isPalletEvent = (event: any): event is PalletEvent => {
  return (
    'pallet' in event &&
    typeof event['pallet'] === 'string' &&
    'palletEvent' in event &&
    (typeof event['palletEvent'] === 'object' || typeof event['palletEvent'] === 'string')
  );
};

/**
 * Checks if the provided object is a valid `IEventRecord`.
 *
 * @param event - The object to be checked.
 * @returns `true` if the object is a valid `IEventRecord`, `false` otherwise.
 *
 * @remarks
 * An `IEventRecord` is expected to have the following properties:
 * - `phase`: An object representing the phase of the event.
 * - `event`: An object representing the event details.
 * - `topics`: An array of topics associated with the event.
 *
 * This function validates the presence and type of these properties in the provided object.
 */
export const isEventRecord = (event: any): event is IEventRecord => {
  return (
    'phase' in event &&
    typeof event['phase'] === 'object' &&
    'event' in event &&
    isPalletEvent(event['event']) &&
    'topics' in event &&
    Array.isArray(event['topics'])
  );
};
