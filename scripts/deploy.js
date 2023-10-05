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
  const cuyNFTName = 'CuyCollectionNft'
  const cuyNftContract = await deploySC(cuyNFTName);
  const cuyNftAddress = await cuyNftContract.getAddress();
  const cuyNftContractImpl = await printAddress(cuyNFTName, cuyNftAddress);
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
  const bbitesTokenName = "BBitesToken"
  const bbitesToken = await deploySC(bbitesTokenName);
  const bbitesAddress = await bbitesToken.getAddress()
  const bbitesContractImpl = await printAddress(bbitesTokenName, bbitesAddress)
  await verify(bbitesContractImpl, bbitesTokenName)

  var relAddGoerli = '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D'; // relayer goerli
  // Deploy public Sale
  const publicSaleName = 'PublicSale'
  const publicSale = await deploySC(publicSaleName, [
    relAddGoerli,
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

