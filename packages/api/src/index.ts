import { shortenAddress } from "@delightfuldot/utils";

const run = async () => {
  console.log(shortenAddress('16n44U9n71QL6Kev9K73WwwaBLBBYYRT1LWjiDzewurD6eVf'))
};

run().catch(console.log);
