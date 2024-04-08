import * as $ from '@dedot/shape';
import { Field } from './scale_info.js';
import { StorageEntryLatest } from './Metadata.js';

export interface PalletInfo {
  pallet: string;
  palletIndex: number;
}

export interface PalletItemMetadata extends PalletInfo {
  name: string;
  fields: Field[];
  fieldCodecs: $.AnyShape[];
  index: number;
  docs: string[];
}

export interface PalletErrorMetadataV14 extends PalletItemMetadata {}
export interface PalletEventMetadataV14 extends PalletItemMetadata {}
export interface PalletTxMetadataV14 extends PalletItemMetadata {}

export interface PalletErrorMetadataV15 extends PalletErrorMetadataV14 {}
export interface PalletEventMetadataV15 extends PalletEventMetadataV14 {}
export interface PalletTxMetadataV15 extends PalletTxMetadataV14 {}

export interface PalletErrorMetadataLatest extends PalletErrorMetadataV15 {}
export interface PalletEventMetadataLatest extends PalletEventMetadataV15 {}
export interface PalletTxMetadataLatest extends PalletTxMetadataV15 {}

export interface PalletStorageEntryMetadataLatest extends StorageEntryLatest, PalletInfo {}
