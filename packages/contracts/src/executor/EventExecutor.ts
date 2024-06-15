import { GenericSubstrateApi } from "@dedot/types";
import { Executor } from "./Executor.js"
import { assert, stringPascalCase } from "@dedot/utils";
import { ContractEvent, ContractEventMeta, GenericContractEvent } from "../types/index.js";

export class EventExecutor<ChainApi extends GenericSubstrateApi> extends Executor<ChainApi> {
	doExecute(eventName: string): GenericContractEvent {
		const eventMeta = this.#findEventMeta(eventName);

		assert(eventMeta, "Contract event metadata not found!");

		const is = (event: ContractEvent): event is ContractEvent => {
			return event.name === eventName;
		}

		const as = (event: ContractEvent): ContractEvent | undefined => {
			return is(event) ? event : undefined;
		}

		return {
			is, 
			as, 
			meta: eventMeta,
		}
	}

	#findEventMeta(eventName: string): ContractEventMeta | undefined {
		return this.registry.metadata.spec.events.find(one => stringPascalCase(one.label) === eventName);
	}
}

