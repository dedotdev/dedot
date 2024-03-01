/**
 * Generic storage interface
 */
export interface IStorage {
  get(key: string): Promise<string | null>;

  set(key: string, value: string): Promise<string>;

  remove(key: string): Promise<void>;

  clear(): Promise<void>;

  length(): Promise<number>;

  keys(): Promise<string[]>;
}
