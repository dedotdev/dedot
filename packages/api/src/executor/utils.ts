import type { IEventRecord } from '@dedot/types';

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
    typeof event['event'] === 'object' &&
    'topics' in event &&
    Array.isArray(event['topics'])
  );
};
