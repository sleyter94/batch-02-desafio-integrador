import { Contract, ethers } from "ethers";

import usdcTknAbi from "../artifacts/contracts/USDCoin.sol/USDCoin.json";
import bbitesTokenAbi from "../artifacts/contracts/BBitesToken.sol/BBitesToken.json";
import publicSaleAbi from "../artifacts/contracts/PublicSale.sol/PublicSale.json";
import nftTokenAbi from '../artifacts/contracts/CuyCollectionNft.sol/CuyCollectionNft.json'
// import bbitesTokenAbi
// import publicSaleAbi
// import nftTknAbi

// SUGERENCIA: vuelve a armar el MerkleTree en frontend
// Utiliza la libreria buffer
import buffer from "buffer/";
import walletAndIds from "../wallets/walletList";
import { MerkleTree } from "merkletreejs";
var Buffer = buffer.Buffer;
var merkleTree;

function hashToken(tokenId, account) {
  return Buffer.from(
    ethers
      .solidityPackedKeccak256(["uint256", "address"], [tokenId, account])
      .slice(2),
    "hex"
  );
}
function buildMerkleTree() {
  var elementosHasheados = walletAndIds.map(({id, address}) => {
    return hashToken(id, address)
  });
  merkleTree = new MerkleTree(elementosHasheados, ethers.keccak256, {
    sortPairs: true,
  });
}

var provider, signer, account;
var usdcTkContract, bbitesTknContract, pubSContract, nftContract;
var usdcAddress, bbitesTknAdd, pubSContractAdd;

function initSCsGoerli() {
  provider = new ethers.BrowserProvider(window.ethereum);

  usdcAddress = "0x570C44378F78BF37656741b8CC9d15274C00688c";
  bbitesTknAdd = "0x2bc50bD9eF6b37cefA4076Ccb0D12da2bD7bd48B";
  pubSContractAdd = "0x5E24EFC1e166d87766f81AEc7695C72c101345CD";
  
  usdcTkContract = new Contract(usdcAddress, usdcTknAbi.abi, provider); // = new Contract(...
  bbitesTknContract = new Contract(bbitesTknAdd, bbitesTokenAbi.abi, provider); // = new Contract(...
  pubSContract = new Contract(pubSContractAdd, publicSaleAbi.abi, provider); // = new Contract(...
}

function initSCsMumbai() {
  provider = new ethers.BrowserProvider(window.ethereum);

  var nftAddress = "0xc8eD066481BfCb0d3347d0252bDb8F08eEDd98D2";

  nftContract = new Contract(nftAddress, nftTokenAbi.abi, provider); // = new Contract(...
}

async function setUpListeners() {
  // Connect to Metamask
  var bttnConnect = document.getElementById("connect");
  var walletIdEl = document.getElementById("walletId");
  bttnConnect.addEventListener("click", async function () {
    if (window.ethereum) {
      [account] = await ethereum.request({
        method: "eth_requestAccounts",
      });
      console.log("Billetera metamask", account);
      walletIdEl.innerHTML = account;
      signer = await provider.getSigner(account);
    }
  });

  var bttnUsdAddress = document.getElementById("usdcAddressBttn");
  bttnUsdAddress.addEventListener("click", async function () {
    var address = await pubSContract.getRouterAddress();
    var balanceEl = document.getElementById("usdcAddress");
    balanceEl.innerHTML = address;
  });

  // USDC Balance - balanceOf
  var bttn = document.getElementById("usdcUpdate");
  bttn.addEventListener("click", async function () {
    var balance = await usdcTkContract.balanceOf(account);
    var balanceEl = document.getElementById("usdcBalance");
    balanceEl.innerHTML = ethers.formatUnits(balance, 6);
  });

  // Bbites token Balance - balanceOf
  var btnBbites = document.getElementById("bbitesTknUpdate");
  btnBbites.addEventListener("click", async function () {
    var balance = await bbitesTknContract.balanceOf(account);
    var balanceEl = document.getElementById("bbitesTknBalance");
    balanceEl.innerHTML = ethers.formatUnits(balance, 18);
  });

  var usdMint = document.getElementById('usdcMintBtn');
  usdMint.addEventListener('click', async function() {
    await usdcTkContract.connect(signer).mint(account, 10_000 * 1e6)
  })

  var bbitesMint = document.getElementById('bbitesTknMintBtn');
  bbitesMint.addEventListener('click', async function() {
    await bbitesTknContract.connect(signer).mint(account, ethers.parseEther("1000"))
  })
  
  

  // APPROVE BBTKN
  // bbitesTknContract.approve
  var bttnApproveBBTkn = document.getElementById("approveButtonBBTkn");
  bttnApproveBBTkn.addEventListener('click', async () => {
    var value = document.getElementById("approveInput").value
    await bbitesTknContract.connect(signer).approve(pubSContractAdd, ethers.parseUnits(value, 18))
  })
  // APPROVE USDC
  // usdcTkContract.approve
  var bttnApproveUsdc = document.getElementById("approveButtonUSDC");
  bttnApproveUsdc.addEventListener('click', async () => {
    var value = document.getElementById("approveInputUSDC").value
    await usdcTkContract.connect(signer).approve(pubSContractAdd, ethers.parseUnits(value, 6))
  })

  // purchaseWithTokens
  var bttnPurchaseWithBbites = document.getElementById("purchaseButton");
  bttnPurchaseWithBbites.addEventListener('click', async () => {
    var id = document.getElementById('purchaseInput').value
    try {
      const tx = await pubSContract
        .connect(signer)
        .purchaseWithTokens(id);
      const res = await tx.wait();
      console.log(res.hash)
    } catch(error) {
      document.getElementById('purchaseError').innerHTML = error.reason
      console.error(error.reason)
    }
  })

  // purchaseWithUSDC
  var bttnPurchaseWithUSDC = document.getElementById("purchaseButtonUSDC");
  bttnPurchaseWithUSDC.addEventListener('click', async () => {
    var id = document.getElementById('purchaseInputUSDC').value
    var amountIn = document.getElementById('amountInUSDCInput').value
    console.log(ethers.parseUnits(amountIn, 6))
    await pubSContract.connect(signer).purchaseWithUSDC(id, ethers.parseUnits(amountIn, 6))
  })

  // purchaseWithEtherAndId
  var bttnPurchaseWithEtherAndId = document.getElementById("purchaseButtonEtherId");
  bttnPurchaseWithEtherAndId.addEventListener('click', async () => {
    var id = document.getElementById('purchaseInputEtherId').value
    await pubSContract.connect(signer).purchaseWithEtherAndId(id, {value: ethers.parseUnits('0.01', 18)})
  })
  // send Ether
  var bttnSendEther = document.getElementById("sendEtherButton");
  bttnSendEther.addEventListener('click', async () => {
    await pubSContract.connect(signer).depositEthForARandomNft({value: ethers.parseUnits('0.01', 18)})
  })
  // getPriceForId
  var bttnGetPriceForId = document.getElementById("getPriceNftByIdBttn");
  bttnGetPriceForId.addEventListener('click', async () => {
    var id = document.getElementById('priceNftIdInput').value
    const price = await pubSContract.getPriceForId(id)
    document.getElementById('priceNftByIdText').innerHTML = ethers.formatUnits(price)
  })
  // getProofs
  var bttnProofButtonId = document.getElementById("getProofsButtonId");
  bttnProofButtonId.addEventListener("click", async () => {
    var id = document.getElementById("inputIdProofId").value;
    var address = document.getElementById("inputAccountProofId").value;
    var proofs = merkleTree.getHexProof(hashToken(id, address));
    document.getElementById('showProofsTextId').innerHTML = JSON.stringify(proofs)
    navigator.clipboard.writeText(JSON.stringify(proofs));
  });

  var bttnSafeMintWhiteList = document.getElementById("safeMintWhiteListBttnId");
  // usar ethers.hexlify porque es un array de bytes
  bttnSafeMintWhiteList.addEventListener('click', async () => {
    var proofsValue = document.getElementById("whiteListToInputProofsId").value;
    var to = document.getElementById('whiteListToInputId').value
    var tokenId = document.getElementById('whiteListToInputTokenId').value
    proofsValue = JSON.parse(proofsValue).map(ethers.hexlify);
    await nftContract.connect(signer).safeMintWhiteList(to, tokenId, proofsValue)
  })
  

  // buyBack
  var bttnBuyBack = document.getElementById("buyBackBttn");
  bttnBuyBack.addEventListener('click', async () => {
    var id = document.getElementById('buyBackInputId').value
    await nftContract.connect(signer).buyBack(id)
  })
}

function setUpEventsContracts() {
  var pubSList = document.getElementById("pubSList");
  pubSContract.on("PurchaseNftWithId", (owner, id) => {
    const node = document.createElement("p")
    const textNode = document.createTextNode(`Owner ${owner} Id ${id}`)
    node.appendChild(textNode)
    pubSList.appendChild(node);
  })

  var bbitesListEl = document.getElementById("bbitesTList");
  // bbitesCListener - "Transfer"
  bbitesTknContract.on("Transfer", (from, to, amount) => {
    const node = document.createElement("p")
    const textNode = document.createTextNode(`From ${from} To ${to} Amount ${ethers.formatUnits(amount, 18)}`)
    node.appendChild(textNode)
    bbitesListEl.appendChild(node);
  })

  var nftList = document.getElementById("nftList");
  // nftCListener - "Transfer"
  nftContract.on("Transfer", (from, to, id) => {
    console.log("Find Transfer Event")
    const node = document.createElement("p")
    const textNode = document.createTextNode(`From ${from} To ${to} Token Id ${id}`)
    node.appendChild(textNode)
    nftList.appendChild(node);
  })
  

  var burnList = document.getElementById("burnList");
  // nftCListener - "Burn"
  nftContract.on("Burn", (account,id) => {
    console.log("Find Transfer Event")
    const node = document.createElement("p")
    const textNode = document.createTextNode(`From ${account} Token Id ${id}`)
    node.appendChild(textNode)
    burnList.appendChild(node);
  })
}

async function setUp() {
  window.ethereum.on("chainChanged", (chainId) => {
    window.location.reload();
  });

  initSCsGoerli();

  initSCsMumbai()
  
  await setUpListeners()
  
  setUpEventsContracts()
  
  buildMerkleTree()
}

setUp()
  .then()
  .catch((e) => console.log(e));
