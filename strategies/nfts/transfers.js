const fs = require('fs');
const path = require('path');
const inquirer = require('inquirer');
const chalk = require('chalk');
const { ethers } = require('ethers');
const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();

async function ensureAlchemyRPC() {
  if (!process.env.ALCHEMY_RPC) {
    const answer = await inquirer.prompt([
      { type: 'input', name: 'alchemyRpc', message: 'Enter the Alchemy RPC URL:' }
    ]);
    process.env.ALCHEMY_RPC = answer.alchemyRpc;
    try {
      fs.appendFileSync('.env', `ALCHEMY_RPC=${answer.alchemyRpc}\n`);
      console.log(chalk.green('Alchemy RPC URL saved to .env'));
    } catch (err) {
      console.error(chalk.red('Error saving Alchemy RPC URL to .env file:', err.message));
    }
  }
}

async function ensureXAPIKey() {
  if (!process.env.X_API_KEY) {
    const answer = await inquirer.prompt([
      { type: 'input', name: 'xApiKey', message: 'Enter the X-API-KEY for BlockVision:' }
    ]);
    process.env.X_API_KEY = answer.xApiKey;
    try {
      fs.appendFileSync('.env', `X_API_KEY=${answer.xApiKey}\n`);
      console.log(chalk.green('X-API-KEY saved to .env'));
    } catch (err) {
      console.error(chalk.red('Error saving X-API-KEY to .env file:', err.message));
    }
  }
}

const MAX_ERC1155_SCAN = 10;
const ERC165_ABI = ["function supportsInterface(bytes4 interfaceID) external view returns (bool)"];
const ERC721_ABI = [
  "function name() view returns (string)",
  "function balanceOf(address owner) view returns (uint256)",
  "function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)",
  "function safeTransferFrom(address from, address to, uint256 tokenId)",
  "function ownerOf(uint256 tokenId) view returns (address)"
];
const ERC1155_ABI = [
  "function uri(uint256 tokenId) view returns (string)",
  "function balanceOf(address account, uint256 id) view returns (uint256)",
  "function safeTransferFrom(address from, address to, uint256 id, uint256 amount, bytes data)"
];

async function fetchTokenIds(walletAddress, userContractAddress, apiProvider) {
  if (apiProvider === 'Alchemy') {
    const pageSize = 100;
    const alchemyUrl = `${process.env.ALCHEMY_RPC}/getNFTsForOwner/?owner=${walletAddress}&pageSize=${pageSize}`;
    try {
      const response = await axios.get(alchemyUrl);
      if (response.data.ownedNfts && Array.isArray(response.data.ownedNfts)) {
        const tokenIds = new Set();
        for (const nft of response.data.ownedNfts) {
          if (nft.contract && nft.contract.address && nft.contract.address.toLowerCase() === userContractAddress.toLowerCase() && nft.id && nft.id.tokenId) {
            tokenIds.add(nft.id.tokenId);
          }
        }
        return Array.from(tokenIds);
      }
      return [];
    } catch (err) {
      console.error(chalk.red(`Error fetching Alchemy API data for wallet [${walletAddress}]: ${err.message}`));
      return [];
    }
  } else {
    const url = `https://api.blockvision.org/v2/monad/account/nfts?address=${walletAddress}&pageIndex=1`;
    try {
      const response = await axios.get(url, { headers: { 'accept': 'application/json', 'x-api-key': process.env.X_API_KEY } });
      if (response.data.code === 0 && response.data.result && Array.isArray(response.data.result.data)) {
        const tokenIds = new Set();
        for (const collection of response.data.result.data) {
          if (collection.contractAddress && collection.contractAddress.toLowerCase() === userContractAddress.toLowerCase() && Array.isArray(collection.items)) {
            for (const item of collection.items) {
              if (item.tokenId) tokenIds.add(item.tokenId);
            }
          }
        }
        return Array.from(tokenIds);
      }
      return [];
    } catch (err) {
      console.error(chalk.red(`Error fetching BlockVision API data for wallet [${walletAddress}]: ${err.message}`));
      return [];
    }
  }
}

async function getTxOverrides(provider) {
  const block = await provider.getBlock('latest');
  const baseFee = block.baseFeePerGas;
  const feeMultiplier = baseFee.mul(105).div(100);
  const gasLimit = Math.floor(Math.random() * (180000 - 120000 + 1)) + 120000;
  return { gasLimit, maxFeePerGas: feeMultiplier, maxPriorityFeePerGas: feeMultiplier };
}

let currentERC1155ID = null;
let cachedERC1155URI = null;

async function main() {
  const baseAnswers = await inquirer.prompt([
    { type: 'input', name: 'contractAddress', message: 'Enter the NFT contract address to check (transfer):' },
    { type: 'input', name: 'destinationWallet', message: 'Enter the destination wallet address for the NFTs:' },
    { type: 'list', name: 'apiProvider', message: 'Select the NFT API provider:', choices: ['BlockVision', 'Alchemy'] },
    { type: 'input', name: 'checkAll', message: 'Do you want to check & transfer NFTs from all wallets? (y/n)', validate: input => ['y', 'n'].includes(input.toLowerCase()) ? true : 'Please answer with y or n' }
  ]);
  let walletsToCheck = [];
  if (baseAnswers.checkAll.toLowerCase() === 'y') {
    walletsToCheck = require(path.join(__dirname, '../../utils/wallets.json'));
  } else {
    const idAnswer = await inquirer.prompt([{ type: 'input', name: 'walletIDs', message: 'Enter the wallet IDs to check (separated by spaces):' }]);
    const ids = idAnswer.walletIDs.split(' ').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
    walletsToCheck = require(path.join(__dirname, '../../utils/wallets.json')).filter(w => ids.includes(w.id));
  }
  const provider = new ethers.providers.JsonRpcProvider(require(path.join(__dirname, '../../utils/chain.js')).RPC_URL);
  const baseContract = new ethers.Contract(baseAnswers.contractAddress, ERC165_ABI, provider);
  let contractType = null;
  try {
    const isERC721 = await baseContract.supportsInterface("0x80ac58cd");
    const isERC1155 = await baseContract.supportsInterface("0xd9b67a26");
    if (isERC721) contractType = "ERC721"; else if (isERC1155) contractType = "ERC1155"; else { console.error(chalk.red("The contract does not implement ERC721 or ERC1155 interfaces.")); process.exit(1); }
  } catch (err) { console.error(chalk.red("Error checking contract interface:"), err.message); process.exit(1); }
  if (contractType === "ERC721") {
    try {
      const nftContractForInfo = new ethers.Contract(baseAnswers.contractAddress, ERC721_ABI, provider);
      const nftName = await nftContractForInfo.name();
      console.log(chalk.cyan(`NFT Name: ${nftName}`));
    } catch (e) { console.log(chalk.yellow("Could not retrieve NFT name.")); }
  } else if (contractType === "ERC1155") {
    console.log(chalk.cyan("ERC1155 contract detected."));
  }
  console.log(chalk.cyan.bold(`\nChecking NFT availability for contract [${baseAnswers.contractAddress}] as ${contractType}\n`));
  async function processWallet(walletInfo) {
    console.log(chalk.blue(`Checking address - [${walletInfo.address}]`));
    try {
      const wallet = new ethers.Wallet(walletInfo.privateKey, provider);
      if (contractType === "ERC721") {
        const nftContract = new ethers.Contract(baseAnswers.contractAddress, ERC721_ABI, wallet);
        const balanceBN = await nftContract.balanceOf(wallet.address);
        if (balanceBN.toNumber() === 0) { console.log(chalk.red(`No NFT found (balanceOf = 0) for wallet [${wallet.address}]\n`)); return; }
        const tokenIds = await fetchTokenIds(wallet.address, baseAnswers.contractAddress, baseAnswers.apiProvider);
        if (!tokenIds || tokenIds.length === 0) { console.log(chalk.red(`No NFT found via API for wallet [${wallet.address}]\n`)); return; }
        console.log(chalk.green(`NFT(s) found for wallet [${wallet.address}]: Token IDs: [${tokenIds.join(', ')}]`));
        for (const tokenId of tokenIds) {
          const overrides = await getTxOverrides(provider);
          try {
            const tx = await nftContract.safeTransferFrom(wallet.address, baseAnswers.destinationWallet, tokenId, overrides);
            console.log(chalk.yellow(`Transfer Tx sent for NFT ID [${tokenId}] - [${require(path.join(__dirname, '../../utils/chain.js')).TX_EXPLORER}${tx.hash}]`));
            const receipt = await tx.wait(1);
            console.log(chalk.magenta(`Tx confirmed in block [${receipt.blockNumber}]\n`));
          } catch (transferError) { console.error(chalk.red(`Error transferring NFT ID [${tokenId}] from ${wallet.address}: ${transferError.message}\n`)); }
        }
      } else if (contractType === "ERC1155") {
        const nftContract = new ethers.Contract(baseAnswers.contractAddress, ERC1155_ABI, wallet);
        if (currentERC1155ID === null) {
          for (let tokenId = 0; tokenId <= MAX_ERC1155_SCAN; tokenId++) {
            const balanceBN = await nftContract.balanceOf(wallet.address, tokenId);
            if (balanceBN.toNumber() > 0) { currentERC1155ID = tokenId; break; }
          }
        }
        if (currentERC1155ID === null) { console.log(chalk.red(`No ERC1155 tokens found for wallet [${wallet.address}]\n`)); return; }
        const balanceBN = await nftContract.balanceOf(wallet.address, currentERC1155ID);
        console.log(chalk.green(`ERC1155 token found for wallet [${wallet.address}]: Token ID [${currentERC1155ID}]`));
        if (!cachedERC1155URI) {
          try {
            cachedERC1155URI = await nftContract.uri(currentERC1155ID);
            console.log(chalk.cyan(`Token URI for [${currentERC1155ID}]: ${cachedERC1155URI}`));
          } catch (e) { console.log(chalk.yellow(`Token URI not available for token ID [${currentERC1155ID}].`)); }
        }
        const overrides = await getTxOverrides(provider);
        try {
          const tx = await nftContract.safeTransferFrom(wallet.address, baseAnswers.destinationWallet, currentERC1155ID, balanceBN, "0x", overrides);
          console.log(chalk.yellow(`Transfer Tx sent for ERC1155 Token ID [${currentERC1155ID}] - [${require(path.join(__dirname, '../../utils/chain.js')).TX_EXPLORER}${tx.hash}]`));
          const receipt = await tx.wait(1);
          console.log(chalk.magenta(`Tx confirmed in block [${receipt.blockNumber}]\n`));
        } catch (transferError) { console.error(chalk.red(`Error transferring ERC1155 token ID [${currentERC1155ID}] from ${wallet.address}: ${transferError.message}\n`)); }
      }
    } catch (err) { console.error(chalk.red(`Error processing wallet ${walletInfo.address}: ${err.message}\n`)); }
  }
  for (const walletInfo of walletsToCheck) { await processWallet(walletInfo); }
  console.log(chalk.green.bold('All wallet checks completed.'));
}

ensureAlchemyRPC()
  .then(() => ensureXAPIKey())
  .then(() => main())
  .catch(err => console.error(chalk.red('Script encountered an error:'), err));
