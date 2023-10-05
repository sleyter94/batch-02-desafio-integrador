require("dotenv").config();
const { ethers } = require("hardhat");

const bbitesAddress = '0x09BA191dd49776631C676aa1B1283911C9fA2A2d';
let signer, provider;
async function setUpMetamask() {

  if (window.ethereum) {
    // valida que exista la extension de metamask conectada
    [account] = await ethereum.request({
      method: "eth_requestAccounts",
    });
    console.log("Billetera metamask", account);

    provider = new ethers.BrowserProvider(window.ethereum);
    signer = await provider.getSigner(account);
  }
}


async function main() {
  await setUpMetamask();
  provider = new ethers.BrowserProvider(window.ethereum);
  const BbitesToken = await ethers.getContractFactory("BBitesToken")
  const token = await BbitesToken.attach(bbitesAddress);
  await token.mint('0x300F219aDCB06259190F7F053a1d136e2856Fc0d', 1_000_000 * 1e18);
}

main()
.catch((error) => {
  console.error(error);
  process.exitCode = 1;
})