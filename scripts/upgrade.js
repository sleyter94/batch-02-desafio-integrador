const { ethers, upgrades } = require("hardhat")

async function upgradePublicSale() {
  const proxyAddress = '0x2bc50bD9eF6b37cefA4076Ccb0D12da2bD7bd48B'
  const BbitesTokenV2 = await ethers.getContractFactory('BBitesToken')
  const bbitesTokenV2 = await upgrades.upgradeProxy(
    proxyAddress,
    BbitesTokenV2
  )

  var tx = await bbitesTokenV2.waitForDeployment()
  // Reintentar muchas veces, el nodo de alchemy puede bloquearte
  console.log(tx)
  return;
  await tx.deploymentTransaction().wait(5)

  var implV2 = await upgrades.erc1967.getImplementationAddress(proxyAddress)
  await hre.run('verify:verify', {
    address: implV2,
    constructorArguments: []
  })

  console.log(implV2)

}

upgradePublicSale()
.catch(error => {
  console.error(error);
  process.exitCode = 1;
})