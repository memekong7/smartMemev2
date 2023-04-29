const {
  time,
  loadFixture,
} = require("@nomicfoundation/hardhat-network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");

describe("MEMEKONG", function () {
  let MEMEKONG;
  let memekong;
  let owner;
  let addr1;
  let addr2;

  beforeEach(async function () {
    MEMEKONG = await ethers.getContractFactory("MEMEKONG");
    [owner, addr1, addr2] = await ethers.getSigners();
    memekong = await MEMEKONG.deploy(1000);
  });

  describe("Deployment", function () {

    it("Should deploy MEMEKONG contract", async function () {
      await memekong.deployed();
      console.log("MEMEKONG deployed to:", memekong.address);
    });

    it("Should set the correct name", async function () {
      await memekong.deployed();
      expect(await memekong.name()).to.equal("MEME KONG");
    });

    it("Should mint and allocate initial tokens correctly", async function() {
      const totalSupply = await memekong.totalSupply();
      const creatorBalance = await memekong.balanceOf(owner.address);
      expect(totalSupply).to.equal(1000);
      expect(creatorBalance).to.equal(1000);
    });

    it("should return the correct token name", async () => {
      expect(await memekong.name()).to.equal("MEME KONG");
    });

    it("should return the correct token symbol", async () => {
      expect(await memekong.symbol()).to.equal("MKONG");
    });

    it("should return the correct token decimals", async () => {
      expect(await memekong.decimals()).to.equal(9);
    });

    it("Should transfer tokens", async function() {
      // Transfer 1000 tokens from owner to addr1
      await memekong.transfer(addr1.address, 100);

      // Verify balances
      expect(await memekong.balanceOf(owner.address)).to.equal(900);
      expect(await memekong.balanceOf(addr1.address)).to.equal(100);
  
      // Transfer 500 tokens from addr1 to addr2
      await memekong.connect(addr1).transfer(addr2.address, 50);
  
      // Verify balances
      expect(await memekong.balanceOf(addr1.address)).to.equal(50);
      expect(await memekong.balanceOf(addr2.address)).to.equal(50);
    });

    it("Should update allowance correctly", async function () {
      // Define the initial allowance
      const initialAllowance = 100;

      // Approve an allowance for addr1
      await memekong.approve(addr1.address, initialAllowance);

      // Verify that the allowance is updated correctly
      const allowance = await memekong.allowance(owner.address, addr1.address);
      expect(allowance).to.equal(initialAllowance);
    });

    it('should return the correct allowance for a spender', async function () {
      // set the allowance of the spender to 100
      await memekong.connect(owner).approve(addr1.address, 100);
  
      // get the allowance of the spender
      const allowance = await memekong.allowance(owner.address, addr1.address);
  
      // check that the allowance is correct
      expect(allowance).to.equal(100);
    });

    it("should transfer tokens using transferFrom", async function() {
      // transfer tokens from owner to addr1
      await memekong.transfer(addr1.address, 100);
      expect(await memekong.balanceOf(addr1.address)).to.equal(100);
  
      // approve addr2 to spend 5000 tokens from addr1's account
      await memekong.connect(addr1).approve(addr2.address, 50);
      expect(await memekong.allowance(addr1.address, addr2.address)).to.equal(50);
  
      // transfer 3000 tokens from addr1 to addr2 using transferFrom
      await memekong.connect(addr2).transferFrom(addr1.address, addr2.address, 30);
  
      // check balances and allowances after the transfer
      expect(await memekong.balanceOf(addr1.address)).to.equal(70);
      expect(await memekong.balanceOf(addr2.address)).to.equal(30);
      expect(await memekong.allowance(addr1.address, addr2.address)).to.equal(20);
    });

    it("should increase allowance correctly", async function() {
      // Check initial allowance
      let allowance = await memekong.allowance(owner.address, addr1.address);
      expect(allowance).to.equal(0);
  
      // Increase allowance
      await memekong.increaseAllowance(addr1.address, 50);
  
      // Check updated allowance
      allowance = await memekong.allowance(owner.address, addr1.address);
      expect(allowance).to.equal(50);
    });
    
    it("should decrease allowance of addr1 and verify that allowance is updated correctly", async function () {
      // Set initial allowance
      const initialAllowance = 1000;
      await memekong.approve(addr1.address, initialAllowance);

      // Decrease allowance
      const decreaseAmount = 500;
      await memekong.decreaseAllowance(addr1.address, decreaseAmount);

      // Verify allowance is updated correctly
      const allowance = await memekong.allowance(owner.address, addr1.address);
      expect(allowance).to.equal(initialAllowance - decreaseAmount);
    });
  });
});
