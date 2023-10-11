var { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
var { expect } = require("chai");
var { ethers } = require("hardhat");
var { time } = require("@nomicfoundation/hardhat-network-helpers");
var { MerkleTree } = require("merkletreejs");

const { getRole, deploySC, deploySCNoUp, ex, pEth } = require("../utils");
const { getRootFromMT } = require("../utils/merkleTree");

const MINTER_ROLE = getRole("MINTER_ROLE");
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
  let cuyNftContract, cuyNftAddress;
  let merkleTree

  before(async () => {
    [owner, alice, bob, carl, deysi, estefan] = await ethers.getSigners();
    cuyNftContract = await deploySC(cuyNFTName);
    cuyNftAddress = await cuyNftContract.getAddress()
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
    cuyNftContract.connect(owner).grantRole(MINTER_ROLE, alice.address)
    const safeMint = cuyNftContract.connect(alice).safeMint;
    const tokenId = 10000;
    await expect(
      safeMint(alice.address, tokenId)
    ).to.revertedWith(
      `Token ID no permitido`
    )
  })

  it('safeMint should emit Transfer event', async () => {
    cuyNftContract.connect(owner).grantRole(MINTER_ROLE, alice.address)
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
    cuyNftContract.connect(owner).grantRole(MINTER_ROLE, alice.address)
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

  it('safeMint protegido por PAUSER_ROLE', async () => {
    cuyNftContract.connect(owner).grantRole(MINTER_ROLE, alice.address)
    const safeMint = cuyNftContract.connect(alice).safeMint;
    const tokenId = 100;
    await cuyNftContract.connect(owner).pause()
    await expect(
      safeMint(alice.address, tokenId)
    ).to.revertedWith(
      `Pausable: paused`
    )
  })

});
