/// <reference types="vite/client" />

import type { InjectedWindow } from 'dedot/types';

declare global {
  interface Window extends InjectedWindow {}
}
