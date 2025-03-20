// strategies/nfts/transfers.js

const fs = require('fs');
const path = require('path');
const inquirer = require('inquirer');
const chalk = require('chalk');
const { ethers } = require('ethers');

// Load chain configuration and wallets
const chain = require(path.join(__dirname, '../../utils/chain.js'));
const wallets = require(path.join(__dirname, '../../utils/wallets.json'));

// Minimal ERC165 ABI to check interface support
const ERC165_ABI = [
  "function supportsInterface(bytes4 interfaceID) external view returns (bool)"
];

// Minimal ERC721 ABI
const ERC721_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)",
  "function safeTransferFrom(address from, address to, uint256 tokenId)"
];

// Minimal ERC1155 ABI
const ERC1155_ABI = [
  "function balanceOf(address account, uint256 id) view returns (uint256)",
  "function safeTransferFrom(address from, address to, uint256 id, uint256 amount, bytes data)"
];

// Default maximum token id to check in ERC1155 enumeration mode
const MAX_TOKEN_ID = 10;

async function main() {
  // Prompt for basic inputs
  const baseAnswers = await inquirer.prompt([
    {
      type: 'input',
      name: 'contractAddress',
      message: 'Please Insert the contract of the NFTs you want to check(transfer):'
    },
    {
      type: 'input',
      name: 'destinationWallet',
      message: 'Please Insert the Wallet that should receive the NFTs found:'
    },
    {
      type: 'input',
      name: 'checkAll',
      message: 'Would you like to check & transfer the NFTs found on all Wallets? (y/n)',
      validate: input => ['y', 'n'].includes(input.toLowerCase()) ? true : 'Please answer with y or n'
    }
  ]);

  // Determine which wallets to check
  let walletsToCheck = [];
  if (baseAnswers.checkAll.toLowerCase() === 'y') {
    walletsToCheck = wallets;
  } else {
    const idAnswer = await inquirer.prompt([
      {
        type: 'input',
        name: 'walletIDs',
        message: 'Please insert the IDs of the wallets to check (separated by spaces):'
      }
    ]);
    const ids = idAnswer.walletIDs.split(' ').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
    walletsToCheck = wallets.filter(w => ids.includes(w.id));
  }

  // Setup provider and instance for interface check
  const provider = new ethers.providers.JsonRpcProvider(chain.RPC_URL);
  const baseContract = new ethers.Contract(baseAnswers.contractAddress, ERC165_ABI, provider);

  // Determine contract type via ERC165 supportsInterface
  let contractType = null;
  try {
    const isERC721 = await baseContract.supportsInterface("0x80ac58cd"); // ERC721 interfaceId
    const isERC1155 = await baseContract.supportsInterface("0xd9b67a26"); // ERC1155 interfaceId

    if (isERC721) {
      contractType = "ERC721";
    } else if (isERC1155) {
      contractType = "ERC1155";
    } else {
      console.error(chalk.red("The contract does not implement ERC721 or ERC1155 interfaces."));
      process.exit(1);
    }
  } catch (err) {
    console.error(chalk.red("Error checking contract interface:"), err.message);
    process.exit(1);
  }

  let tokenIdInput = null;
  // For ERC1155, prompt for a token id; if left empty, we enumerate a default range.
  if (contractType === "ERC1155") {
    const tokenAnswer = await inquirer.prompt([
      {
        type: 'input',
        name: 'tokenId',
        message: 'Please Insert the Token ID you want to check/transfer (leave blank to enumerate a default range):'
      }
    ]);
    tokenIdInput = tokenAnswer.tokenId.trim();
  }

  console.log(chalk.cyan.bold(`\nChecking Availability of NFT with Contract - [${baseAnswers.contractAddress}] as ${contractType}\n`));

  // Process each wallet
  for (const walletInfo of walletsToCheck) {
    console.log(chalk.blue(`🔍 Checking Address - [${walletInfo.address}]`));
    try {
      // Create a wallet instance connected to the provider
      const wallet = new ethers.Wallet(walletInfo.privateKey, provider);
      
      if (contractType === "ERC721") {
        const nftContract = new ethers.Contract(baseAnswers.contractAddress, ERC721_ABI, wallet);
        const balance = await nftContract.balanceOf(wallet.address);
        if (balance.toNumber() === 0) {
          console.log(chalk.red(`❌ No NFT Found for this Address\n`));
        } else {
          console.log(chalk.green(`✅ NFT Found! Initializing Transfer...`));
          // Loop over each NFT and transfer it
          for (let i = 0; i < balance.toNumber(); i++) {
            const tokenId = await nftContract.tokenOfOwnerByIndex(wallet.address, i);
            const tx = await nftContract.safeTransferFrom(wallet.address, baseAnswers.destinationWallet, tokenId);
            console.log(chalk.yellow(`🚀 Transfer Tx Sent! - [${chain.TX_EXPLORER}${tx.hash}]`));
            const receipt = await tx.wait(1);
            console.log(chalk.magenta(`📦 Tx Confirmed in Block - [${receipt.blockNumber}]\n`));
          }
        }
      } else if (contractType === "ERC1155") {
        const nftContract = new ethers.Contract(baseAnswers.contractAddress, ERC1155_ABI, wallet);
        // If user provided a token ID, use it; otherwise, enumerate a range of token IDs.
        if (tokenIdInput) {
          const balance = await nftContract.balanceOf(wallet.address, tokenIdInput);
          if (balance.toNumber() === 0) {
            console.log(chalk.red(`❌ No NFT Found for Token ID [${tokenIdInput}] on this Address\n`));
          } else {
            console.log(chalk.green(`✅ NFT Found! Initializing Transfer for Token ID [${tokenIdInput}]...`));
            const tx = await nftContract.safeTransferFrom(wallet.address, baseAnswers.destinationWallet, tokenIdInput, balance, "0x");
            console.log(chalk.yellow(`🚀 Transfer Tx Sent! - [${chain.TX_EXPLORER}${tx.hash}]`));
            const receipt = await tx.wait(1);
            console.log(chalk.magenta(`📦 Tx Confirmed in Block - [${receipt.blockNumber}]\n`));
          }
        } else {
          // Enumerate a default range (0 to MAX_TOKEN_ID) to detect tokens with balance > 0.
          let found = false;
          for (let tokenId = 0; tokenId <= MAX_TOKEN_ID; tokenId++) {
            const balance = await nftContract.balanceOf(wallet.address, tokenId);
            if (balance.toNumber() > 0) {
              found = true;
              console.log(chalk.green(`✅ NFT Found! Initializing Transfer for Token ID [${tokenId}]...\n`));
              const tx = await nftContract.safeTransferFrom(wallet.address, baseAnswers.destinationWallet, tokenId, balance, "0x");
              console.log(chalk.yellow(`🚀 Transfer Tx Sent! - [${chain.TX_EXPLORER}${tx.hash}]`));
              const receipt = await tx.wait(1);
              console.log(chalk.magenta(`📦 Tx Confirmed in Block - [${receipt.blockNumber}]\n`));
            }
          }
          if (!found) {
            console.log(chalk.red(`❌ No NFT Found in the default token range on this Address\n`));
          }
        }
      }
    } catch (err) {
      console.error(chalk.red(`Error processing wallet ${walletInfo.address}: ${err.message}\n`));
    }
  }
  
  console.log(chalk.green.bold('All wallet checks completed.'));
}

main()
  .then(() => {})
  .catch(err => console.error(chalk.red('Script encountered an error:'), err));
