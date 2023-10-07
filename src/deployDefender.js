require("dotenv").config();
const publicSaleAbi = require("../artifacts/contracts/PublicSale.sol/PublicSale.json")
const { SentinelClient } = require('@openzeppelin/defender-sentinel-client');
const { AutotaskClient } = require('@openzeppelin/defender-autotask-client');
const client = new SentinelClient({ apiKey: process.env.DEFENDER_API_KEY, apiSecret: process.env.DEFENDER_SECRET_KEY });
const autoTask = new AutotaskClient({ apiKey: process.env.DEFENDER_API_KEY, apiSecret: process.env.DEFENDER_SECRET_KEY })
const main = async () => {
  const requestParameters = {
    type: 'BLOCK',
    network: 'goerli',
    confirmLevel: 1,
    name:'My new Sentinel',
    addresses: ['0x5E24EFC1e166d87766f81AEc7695C72c101345CD'],
    abi: publicSaleAbi.abi,
    paused: false,
    eventConditions: [
      {
        eventSignature: "PurchaseNftWithId(address,uint256)"
      }
    ],
    autotaskTrigger: 'f6d1fe77-cc4c-4bbe-93e7-ec6b8ebc358e'
  }
  await client.create(requestParameters);
  const sentinels = await client.list();
  console.log(sentinels)
  const autotask = await autoTask.list();
  console.log(autotask)
}

main()
.catch((error) => {
  console.error(error);
  process.exitCode = 1;
})