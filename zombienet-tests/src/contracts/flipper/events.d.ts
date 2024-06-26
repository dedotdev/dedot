// Generated by @dedot/codegen

import { GenericSubstrateApi } from '@dedot/types';
import type { GenericContractEvent, GenericContractEvents } from 'dedot/contracts';

export interface ContractEvents<ChainApi extends GenericSubstrateApi> extends GenericContractEvents<ChainApi> {
  Flipped: GenericContractEvent<'Flipped', { old: boolean; new: boolean }>;
}
