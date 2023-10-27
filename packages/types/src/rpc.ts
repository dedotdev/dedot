import { registry } from './registry';

export interface RpcMethods {
  methods: Array<string>;
  version?: number;
}
registry.add('RpcMethods');
