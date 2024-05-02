import rawMotherSpace from '../../../metadata/motherspace.json' assert { type: 'json' };
import {parseRawMetadata} from "./utils";
import {Contract} from "./executor";
import {Motherspace} from "./motherspace";
import {Dedot, SubstrateApi} from "dedot";

(async () => {
  const contractAddress = '5GQJ9';
  const motherSpace = parseRawMetadata(JSON.stringify(rawMotherSpace));

  const api = await Dedot.create<SubstrateApi>('ws://localhost:9944');
  const contract = new Contract<Motherspace, SubstrateApi>(api, contractAddress, motherSpace);


  contract.query.
})();
