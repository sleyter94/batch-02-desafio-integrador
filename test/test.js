var { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
var { expect } = require("chai");
var { ethers } = require("hardhat");

var { time } = require("@nomicfoundation/hardhat-network-helpers");
var { MerkleTree } = require("merkletreejs");
var uniswapRouter = require('@uniswap/v2-periphery/build/UniswapV2Router02.json')

const { getRole, deploySC, deploySCNoUp, ex, pEth } = require("../utils");
const { getRootFromMT } = require("../utils/merkleTree");

const MINTER_ROLE = getRole("MINTER_ROLE");
const PAUSER_ROLE = getRole("PAUSER_ROLE");
const BURNER_ROLE = getRole("BURNER_ROLE");
function hashToken(tokenId, account) {
  return Buffer.from(
    ethers
      .solidityPackedKeccak256(["uint256", "address"], [tokenId, account])
      .slice(2),
    "hex"
  );
}
// 00 horas del 30 de septiembre del 2023 GMT
var startDate = 1696032000;

describe("CuyCollectionNft Testing", async function () {
  let owner, alice, bob, carl, deysi, estefan; const cuyNFTName = 'CuyCollectionNft'
  let cuyNftContract;
  let merkleTree

  before(async () => {
    [owner, alice, bob, carl, deysi, estefan] = await ethers.getSigners();
    cuyNftContract = await deploySC(cuyNFTName);
    const hashes = [owner, alice, bob, carl, deysi, estefan]
      .map((value, index) => (hashToken(1_000 + index, value.address)))
    merkleTree = new MerkleTree(hashes, ethers.keccak256, {
      sortPairs: true,
    });
  })

  it('safeMint protegido por MINTER_ROLE', async () => {
    const safeMint = cuyNftContract.connect(alice).safeMint;
    const tokenId = 10;
    await expect(
      safeMint(alice.address, tokenId)
    ).to.revertedWith(
      `AccessControl: account ${alice.address.toLowerCase()} is missing role ${MINTER_ROLE}`
    )
  })

  it('safeMint no puede mintear id no permitido', async () => {
    await cuyNftContract.connect(owner).grantRole(MINTER_ROLE, alice.address)
    const safeMint = cuyNftContract.connect(alice).safeMint;
    const tokenId = 10000;
    await expect(
      safeMint(alice.address, tokenId)
    ).to.revertedWith(
      `Token ID no permitido`
    )
  })

  it('safeMint should emit Transfer event', async () => {
    await cuyNftContract.connect(owner).grantRole(MINTER_ROLE, alice.address)
    const safeMint = cuyNftContract.connect(alice).safeMint;
    const tokenId = 100;
    await expect(
      safeMint(alice.address, tokenId)
    ).to.emit(cuyNftContract, 'Transfer')
    .withArgs(ethers.ZeroAddress, alice.address, tokenId)
    expect(
      await cuyNftContract.balanceOf(alice.address)
    ).to.equal(1)
    expect(
      await cuyNftContract.ownerOf(tokenId)
    ).to.equal(alice.address)
  })

  it('safeMintWhiteList: account does not belong to whitelist', async () => {
    const tokenId = 1004
    
    const safeMintWhiteList = cuyNftContract.connect(alice).safeMintWhiteList;
    
    await cuyNftContract.connect(owner).updateRoot(merkleTree.getHexRoot())
    const proofs = merkleTree.getHexProof(hashToken(tokenId, bob.address));
    await expect(
      safeMintWhiteList(bob, tokenId, proofs)
    ).to.revertedWith(
      'No eres parte de la lista'
    )
  })

  it('safeMintWhiteList con proofs', async () => {
    const tokenId = 1002
    await cuyNftContract.connect(owner).updateRoot(merkleTree.getHexRoot())
    const safeMintWhiteList = cuyNftContract.connect(bob).safeMintWhiteList;
    const proofs = merkleTree.getHexProof(hashToken(tokenId, bob.address))
    await expect(
      safeMintWhiteList(bob, 1002, proofs)
    ).to.emit(cuyNftContract, 'Transfer')
    .withArgs(ethers.ZeroAddress, bob.address, tokenId)
  })

  it('updateRoot should change root', async () => {
    const root = getRootFromMT()
    await cuyNftContract.connect(owner).updateRoot(root);
    expect(
      await cuyNftContract.root()
    ).to.equal(root)
  })

  it('buyBack should revert for id lower than 1000', async () => {
    await cuyNftContract.connect(owner).grantRole(MINTER_ROLE, alice.address)
    const safeMint = cuyNftContract.connect(alice).safeMint;
    const tokenId = 105;
    await safeMint(alice.address, tokenId);
    
    await expect(
      cuyNftContract.connect(alice).buyBack(tokenId)
    ).to.revertedWith('Buyback is not available')
  })

  it('buyBack should emit Burn event', async () => {
    const tokenId = 1003;
    await cuyNftContract.connect(owner).updateRoot(merkleTree.getHexRoot())
    const safeMintWhiteList = cuyNftContract.connect(carl).safeMintWhiteList;
    const proofs = merkleTree.getHexProof(hashToken(tokenId, carl.address))
    await safeMintWhiteList(carl.address, tokenId, proofs);
    await expect(
      cuyNftContract.connect(carl).buyBack(tokenId)
    ).to.emit(cuyNftContract, 'Burn')
    .withArgs(carl.address, tokenId)
  })

  it('TokenURI not blank', async () => {
    const tokenURI = cuyNftContract.tokenURI;
    const tokenId = 100;
    expect(
      await tokenURI(tokenId)
    ).to.equal(
      `ipfs://QmYH7h4qHfQct87zGssiCRpXEbP9iPvxtvuS2nzmXz2CLB/${tokenId}`
    )
  })

  it('safeMint protegido por PAUSER_ROLE', async () => {
    await cuyNftContract.connect(owner).grantRole(MINTER_ROLE, alice.address)
    const safeMint = cuyNftContract.connect(alice).safeMint;
    const tokenId = 100;
    await cuyNftContract.connect(owner).pause()
    await expect(
      safeMint(alice.address, tokenId)
    ).to.revertedWith(
      `Pausable: paused`
    )

    await cuyNftContract.connect(owner).unpause()
    expect(
      await cuyNftContract.paused()
    ).to.equal(false)
  })

});


describe("PublicSale testing", async () => {
  async function deployFixture() {
    const publicSaleName = 'PublicSale'
    const [owner, alice, bob, carl] = await ethers.getSigners();
    const uniswap = '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D';
    
    const bbitesTokenName = "BBitesToken"
    const bbitesToken = await deploySC(bbitesTokenName);
    const bbitesAddress = await bbitesToken.getAddress();
    
    const usdCoinName = "USDCoin";
    const usdContract = await deploySCNoUp(usdCoinName);
    const usdAddress = await usdContract.getAddress();
    
    const publicSaleContract = await deploySC(publicSaleName, [
      uniswap,
      usdAddress,
      bbitesAddress
    ]);
    
    const uniswapRouterContract = new ethers.Contract(uniswap, uniswapRouter.abi, owner)
    const bbitesAmount = await bbitesToken.balanceOf(owner)
    const usdcAmount = await usdContract.balanceOf(owner)
    await bbitesToken.approve(uniswap, bbitesAmount)
    await usdContract.approve(uniswap, usdcAmount)
    
    await uniswapRouterContract.addLiquidity(
      bbitesAddress,
      usdAddress,
      bbitesAmount,
      usdcAmount,
      bbitesAmount,
      usdcAmount,
      owner.address,
      new Date().getTime() + 600_000
    );
    const tokenAmount = pEth('100000');
    await bbitesToken.mint(owner.address, tokenAmount)
    await usdContract.mint(owner.address, tokenAmount);
    return {publicSaleContract, bbitesToken, usdContract, owner, alice, bob, carl, uniswap}
  }
  

  it('Purchase with tokens, token Id 5', async () => {
    const {publicSaleContract, bbitesToken, owner}  = await loadFixture(deployFixture)
    const tokenId = 5, tokenAmount = await bbitesToken.balanceOf(owner.address);;
    await bbitesToken.approve(await publicSaleContract.getAddress(), tokenAmount)
    await expect(
      publicSaleContract.connect(owner).purchaseWithTokens(tokenId)
    ).to.emit(publicSaleContract, 'PurchaseNftWithId')
    .withArgs(owner.address, tokenId)
    expect(await bbitesToken.balanceOf(owner.address)).to.equal(tokenAmount - pEth('1000'))
  })

  it('Purchase with tokens, token Id 250', async () => {
    const {publicSaleContract, bbitesToken, owner}  = await loadFixture(deployFixture)
    const tokenId = 250, tokenAmount = await bbitesToken.balanceOf(owner.address);
    await bbitesToken.approve(await publicSaleContract.getAddress(), tokenAmount)
    await expect(
      publicSaleContract.connect(owner).purchaseWithTokens(tokenId)
    ).to.emit(publicSaleContract, 'PurchaseNftWithId')
    .withArgs(owner.address, tokenId)
    expect(await bbitesToken.balanceOf(owner.address)).to.equal(tokenAmount - pEth((20*tokenId).toString()))
  })


  it('Purchase with tokens, token Id 550', async () => {
    const {publicSaleContract, bbitesToken, owner}  = await loadFixture(deployFixture)
    const tokenId = 550, tokenAmount = await bbitesToken.balanceOf(owner.address);
    await bbitesToken.approve(await publicSaleContract.getAddress(), tokenAmount)
    await expect(
      publicSaleContract.connect(owner).purchaseWithTokens(tokenId)
    ).to.emit(publicSaleContract, 'PurchaseNftWithId')
    .withArgs(owner.address, tokenId)
    const calculatedPrice = 10_000 + 2_000 * Math.floor((new Date().getTime() / 1000 - startDate) / (24*60*60));
    const price = Math.min(90_000, calculatedPrice)
    expect(await bbitesToken.balanceOf(owner.address)).to.equal(tokenAmount - pEth((price).toString()))
  })

  it('Purchase with tokens, token Id 550', async () => {
    const {publicSaleContract, bbitesToken, owner}  = await loadFixture(deployFixture)
    const tokenId = 550, tokenAmount = await bbitesToken.balanceOf(owner.address);
    await bbitesToken.approve(await publicSaleContract.getAddress(), tokenAmount)
    await time.increase(30*24*60*60 + 1)
    await expect(
      publicSaleContract.connect(owner).purchaseWithTokens(tokenId)
    ).to.emit(publicSaleContract, 'PurchaseNftWithId')
    .withArgs(owner.address, tokenId)
    const price = 90_000;
    expect(await bbitesToken.balanceOf(owner.address)).to.equal(tokenAmount - pEth((price).toString()))
  })

  it('Purchase not available for token ID 800', async () => {
    const {publicSaleContract, bbitesToken, owner}  = await loadFixture(deployFixture)
    const tokenId = 800
    const tokenAmount = await bbitesToken.balanceOf(owner.address);
    await bbitesToken.approve(await publicSaleContract.getAddress(), tokenAmount)
    await expect(
      publicSaleContract.connect(owner).purchaseWithTokens(tokenId)
    ).to.revertedWith(
      'Compra no disponible'
    )
  })

  it('Purchase not available for token already purchased', async () => {
    const {publicSaleContract, bbitesToken, owner, alice}  = await loadFixture(deployFixture)
    const tokenId = 5 
    const tokenAmount = await bbitesToken.balanceOf(owner.address);
    expect(await bbitesToken.balanceOf(owner.address)).to.equal(tokenAmount)
    await bbitesToken.approve(await publicSaleContract.getAddress(), tokenAmount)
    await publicSaleContract.purchaseWithTokens(tokenId)
    
    await bbitesToken.mint(alice.address, tokenAmount)
    await bbitesToken.connect(alice).approve(await publicSaleContract.getAddress(), tokenAmount)

    await expect(
      publicSaleContract.connect(alice).purchaseWithTokens(tokenId)
    ).to.revertedWith(
      'Id no disponible'
    )
  })

  it('Purchase with USDC', async () => {
    const {publicSaleContract, owner, usdContract}  = await loadFixture(deployFixture)
    const tokenId = 5 
    const tokenAmount = await usdContract.balanceOf(owner.address);
    await usdContract.approve(await publicSaleContract.getAddress(), tokenAmount)
    await expect(
      publicSaleContract.purchaseWithUSDC(tokenId, pEth((10_000).toString()))
    ).to.emit(publicSaleContract, 'PurchaseNftWithId')
    .withArgs(owner.address, tokenId)

    expect(await usdContract.balanceOf(owner.address)).to.lessThan(pEth('100000'))
  })

  it('Purchase with Ether', async () => {
    const {publicSaleContract, owner}  = await loadFixture(deployFixture)
    const tokenId = 800 
    const balance = await ethers.provider.getBalance(owner.address);
    await expect(
      publicSaleContract.purchaseWithEtherAndId(tokenId, {value: pEth('0.05')})
    ).to.emit(publicSaleContract, 'PurchaseNftWithId')
    .withArgs(owner.address, tokenId)

    expect(balance - await ethers.provider.getBalance(owner.address)).to.greaterThanOrEqual(pEth('0.01'))
  })

  it('Purchase random', async () => {
    const {publicSaleContract}  = await loadFixture(deployFixture)
    await expect(
      publicSaleContract.depositEthForARandomNft({value: pEth('0.05')})
    ).to.be.revertedWith('Monto incorrecto')
  })

  it('Purchase random', async () => {
    const {publicSaleContract, owner}  = await loadFixture(deployFixture)
    await expect(
      publicSaleContract.depositEthForARandomNft({value: pEth('0.01')})
    ).to.emit(publicSaleContract, 'PurchaseNftWithId')
  })

  it('Sent ether to get random', async () => {
    const {publicSaleContract, owner}  = await loadFixture(deployFixture)
    await expect(
      owner.sendTransaction({
        to: await publicSaleContract.getAddress(),
        value: pEth('0.01')
      })
    ).to.emit(publicSaleContract, 'PurchaseNftWithId')
  })

  it('Withdraw ether', async () => {
    const {publicSaleContract, owner, alice}  = await loadFixture(deployFixture)
    await expect(
      alice.sendTransaction({
        to: await publicSaleContract.getAddress(),
        value: pEth('0.01')
      })
    ).to.emit(publicSaleContract, 'PurchaseNftWithId')
    expect(await ethers.provider.getBalance(await publicSaleContract.getAddress()))
    .to.equals(pEth('0.01'))
    await publicSaleContract.connect(owner).withdrawEther()
    expect(await ethers.provider.getBalance(await publicSaleContract.getAddress()))
    .to.equals(pEth('0'))
  })

  it('Withdraw ether forbidden', async () => {
    const {publicSaleContract, owner, alice}  = await loadFixture(deployFixture)
    await expect(
      alice.sendTransaction({
        to: await publicSaleContract.getAddress(),
        value: pEth('0.01')
      })
    ).to.emit(publicSaleContract, 'PurchaseNftWithId')
    expect(await ethers.provider.getBalance(await publicSaleContract.getAddress()))
    .to.equals(pEth('0.01'))
    await expect(
      publicSaleContract.connect(alice).withdrawEther()
    ).to.revertedWith(
      `AccessControl: account ${alice.address.toLowerCase()} is missing role 0x0000000000000000000000000000000000000000000000000000000000000000`
    )
  })

  it('Withdraw tokens', async () => {
    const {publicSaleContract, bbitesToken, owner, alice}  = await loadFixture(deployFixture)
    const tokenId = 5, tokenAmount = await bbitesToken.balanceOf(owner.address);;
    await bbitesToken.approve(await publicSaleContract.getAddress(), tokenAmount)
    await expect(
      publicSaleContract.connect(owner).purchaseWithTokens(tokenId)
    ).to.emit(publicSaleContract, 'PurchaseNftWithId')
    .withArgs(owner.address, tokenId)
    expect(await bbitesToken.balanceOf(owner.address)).to.equal(tokenAmount - pEth('1000'))

    await publicSaleContract.withdrawTokens()
    expect(await bbitesToken.balanceOf(owner.address)).to.equal(tokenAmount);
  })

  it('paused contract', async () => {
    const {publicSaleContract, owner, alice}  = await loadFixture(deployFixture)
    await publicSaleContract.connect(owner).grantRole(PAUSER_ROLE, alice.address)
    await publicSaleContract.connect(alice).pause()
    expect(
      await publicSaleContract.paused()
    ).to.equal(true)
    await publicSaleContract.connect(alice).unpause()
    expect(
      await publicSaleContract.paused()
    ).to.equal(false)
  })

  it('Addresses', async () => {
    const {publicSaleContract, bbitesToken, usdContract, uniswap}  = await loadFixture(deployFixture)
    expect(
      await publicSaleContract.getUSDCAddress()
    ).to.equal(await usdContract.getAddress())

    expect(
      await publicSaleContract.getTokenAddress()
    ).to.equal(await bbitesToken.getAddress())


    expect(
      await publicSaleContract.getRouterAddress()
    ).to.equal(uniswap)
  })

  it('getPriceForId for forbidden id', async () => {
    const {publicSaleContract}  = await loadFixture(deployFixture)
    const tokenId = 900;
    await expect(
      publicSaleContract.getPriceForId(tokenId)
    ).to.revertedWith(
      `Compra no disponible`
    )
  })



})
