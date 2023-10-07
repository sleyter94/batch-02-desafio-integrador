require("dotenv").config();

const {
  getRole,
  verify,
  ex,
  printAddress,
  deploySC,
  deploySCNoUp,
} = require("../utils");

const { getRootFromMT } = require("../utils/merkleTree");


var MINTER_ROLE = getRole("MINTER_ROLE");
var BURNER_ROLE = getRole("BURNER_ROLE");

// Publicar NFT en Mumbai
async function deployMumbai() {
  const relayerGTM = '0x3126bf3c550300b0D80558299F756E5283f90e3E';
  const cuyNFTName = 'CuyCollectionNft'
  const cuyNftContract = await deploySC(cuyNFTName);
  const cuyNftAddress = await cuyNftContract.getAddress();
  const cuyNftContractImpl = await printAddress(cuyNFTName, cuyNftAddress);
  await cuyNftContract.updateRoot(getRootFromMT())
  await cuyNftContract.grantRole(MINTER_ROLE, relayerGTM)
  await verify(cuyNftContractImpl, cuyNFTName);

  // utiliza deploySC
  // utiliza printAddress
  // utiliza ex
  // utiliza ex
  // utiliza verify
}

// Publicar UDSC, Public Sale y Bbites Token en Goerli
async function deployGoerli() {

  //Deploy USDC
  const usdCoinName = "USDCoin";
  const usdContract = await deploySCNoUp(usdCoinName);
  const usdAddress = await usdContract.getAddress();
  await verify(usdAddress, usdCoinName)

  //Deploy BBitesToken
  const relayerMTG = '0xE2Be2bB960ca035570b7D5AD639779678390C811'
  const bbitesTokenName = "BBitesToken"
  const bbitesToken = await deploySC(bbitesTokenName);
  const bbitesAddress = await bbitesToken.getAddress()
  const bbitesContractImpl = await printAddress(bbitesTokenName, bbitesAddress)
  await bbitesToken.grantRole(MINTER_ROLE, relayerMTG)
  await verify(bbitesContractImpl, bbitesTokenName)

  
  var uniSwap = '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D'; // relayer goerli
  // Deploy public Sale
  const publicSaleName = 'PublicSale'
  const publicSale = await deploySC(publicSaleName, [
    uniSwap,
    usdAddress,
    bbitesAddress
  ]);
  const publicSaleAddress = await publicSale.getAddress();
  const publicSaleImpl = await printAddress(publicSaleName, publicSaleAddress)
  
  await verify(publicSaleImpl, publicSaleName, [])

  // var psC Contrato
  // deploySC;
  // var bbitesToken Contrato
  // deploySC;
  // var usdc Contrato
  // deploySC;
  //0xca420cc41ccf5499c05ab3c0b771ce780198555e
  // var impPS = await printAddress("PublicSale", await psC.getAddress());
  // var impBT = await printAddress("BBitesToken", await bbitesToken.getAddress());

  // set up
  // script para verificacion del contrato
}

deployMumbai()
  // deployGoerli()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });

