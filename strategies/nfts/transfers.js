// strategies/nfts/transfers.js

const fs = require('fs');
const path = require('path');
const inquirer = require('inquirer');
const chalk = require('chalk');
const { ethers } = require('ethers');
const axios = require('axios');

// Load chain configuration and wallets
const chain = require(path.join(__dirname, '../../utils/chain.js'));
const wallets = require(path.join(__dirname, '../../utils/wallets.json'));

// Para ERC1155 se usa un límite fijo para el escaneo (rango 0 a 100)
const MAX_ERC1155_SCAN = 100;  

// Minimal ERC165 ABI para chequear interfaces
const ERC165_ABI = [
  "function supportsInterface(bytes4 interfaceID) external view returns (bool)"
];

// Minimal ERC721 ABI (incluye name, balanceOf, tokenOfOwnerByIndex, ownerOf, safeTransferFrom)
const ERC721_ABI = [
  "function name() view returns (string)",
  "function balanceOf(address owner) view returns (uint256)",
  "function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)",
  "function safeTransferFrom(address from, address to, uint256 tokenId)",
  "function ownerOf(uint256 tokenId) view returns (address)"
];

// Minimal ERC1155 ABI (incluye balanceOf, safeTransferFrom y uri)
const ERC1155_ABI = [
  "function uri(uint256 tokenId) view returns (string)",
  "function balanceOf(address account, uint256 id) view returns (uint256)",
  "function safeTransferFrom(address from, address to, uint256 id, uint256 amount, bytes data)"
];

// Headers fijos para la API
const apiHeaders = {
  'accept': 'application/json',
  'x-api-key': '2ue2zbHIGR5RNqkFxKSiblL7R1P'
};

/**
 * Consulta la nueva API para obtener los NFT de un wallet.
 * Se usa la URL:
 * https://api.blockvision.org/v2/monad/account/nfts?address=$ADDRESS&pageIndex=1
 *
 * Luego se filtra la respuesta para obtener los tokenId cuyo "contractAddress"
 * (en minúsculas) coincide con el contrato ingresado.
 */
async function fetchTokenIds(walletAddress, userContractAddress) {
  const url = `https://api.blockvision.org/v2/monad/account/nfts?address=${walletAddress}&pageIndex=1`;
  try {
    const response = await axios.get(url, { headers: apiHeaders });
    if (response.data.code === 0 && response.data.result && Array.isArray(response.data.result.data)) {
      const tokenIds = new Set();
      // Iterar cada colección encontrada en la respuesta
      for (const collection of response.data.result.data) {
        if (collection.contractAddress && 
            collection.contractAddress.toLowerCase() === userContractAddress.toLowerCase() &&
            Array.isArray(collection.items)) {
          for (const item of collection.items) {
            if (item.tokenId) {
              tokenIds.add(item.tokenId);
            }
          }
        }
      }
      return Array.from(tokenIds);
    }
    return [];
  } catch (err) {
    console.error(chalk.red(`Error fetching API data for wallet [${walletAddress}]: ${err.message}`));
    return [];
  }
}

async function getTxOverrides(provider) {
  const block = await provider.getBlock('latest');
  const baseFee = block.baseFeePerGas; // BigNumber
  const feeMultiplier = baseFee.mul(105).div(100); // baseFee * 1.05
  const gasLimit = Math.floor(Math.random() * (180000 - 120000 + 1)) + 120000;
  return {
    gasLimit: gasLimit,
    maxFeePerGas: feeMultiplier,
    maxPriorityFeePerGas: feeMultiplier
  };
}

async function main() {
  // Preguntar por entradas básicas
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

  // Determinar las wallets a revisar
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

  const provider = new ethers.providers.JsonRpcProvider(chain.RPC_URL);
  const baseContract = new ethers.Contract(baseAnswers.contractAddress, ERC165_ABI, provider);

  // Determinar el tipo de contrato usando ERC165
  let contractType = null;
  try {
    const isERC721 = await baseContract.supportsInterface("0x80ac58cd");
    const isERC1155 = await baseContract.supportsInterface("0xd9b67a26");
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

  if (contractType === "ERC721") {
    try {
      const nftContractForInfo = new ethers.Contract(baseAnswers.contractAddress, ERC721_ABI, provider);
      const nftName = await nftContractForInfo.name();
      console.log(chalk.cyan(`NFT Name: ${nftName}`));
    } catch (e) {
      console.log(chalk.yellow("Could not retrieve NFT name."));
    }
  } else if (contractType === "ERC1155") {
    console.log(chalk.cyan("ERC1155 contract detected."));
  }

  console.log(chalk.cyan.bold(`\nChecking NFT Availability with Contract [${baseAnswers.contractAddress}] as ${contractType}\n`));

  async function processWallet(walletInfo) {
    console.log(chalk.blue(`🔍 Checking Address - [${walletInfo.address}]`));
    try {
      const wallet = new ethers.Wallet(walletInfo.privateKey, provider);
      if (contractType === "ERC721") {
        const nftContract = new ethers.Contract(baseAnswers.contractAddress, ERC721_ABI, wallet);
        const balanceBN = await nftContract.balanceOf(wallet.address);
        if (balanceBN.toNumber() === 0) {
          console.log(chalk.red(`❌ No NFT Found (balanceOf = 0) for wallet [${wallet.address}]\n`));
          return;
        }
        // Usar la API para obtener los tokenIds correspondientes al contrato ingresado
        const tokenIds = await fetchTokenIds(wallet.address, baseAnswers.contractAddress);
        if (!tokenIds || tokenIds.length === 0) {
          console.log(chalk.red(`❌ No NFT Found via API for wallet [${wallet.address}]\n`));
          return;
        }
        console.log(chalk.green(`✅ NFT(s) found for wallet [${wallet.address}]: Token IDs: [${tokenIds.join(', ')}]`));
        for (const tokenId of tokenIds) {
          const overrides = await getTxOverrides(provider);
          try {
            const tx = await nftContract.safeTransferFrom(wallet.address, baseAnswers.destinationWallet, tokenId, overrides);
            console.log(chalk.yellow(`🚀 Transfer Tx Sent for NFT ID [${tokenId}]! - [${chain.TX_EXPLORER}${tx.hash}]`));
            const receipt = await tx.wait(1);
            console.log(chalk.magenta(`📦 Tx Confirmed in Block - [${receipt.blockNumber}]\n`));
          } catch (transferError) {
            console.error(chalk.red(`Error transferring NFT ID [${tokenId}] from ${wallet.address}: ${transferError.message}\n`));
          }
        }
      } else if (contractType === "ERC1155") {
        const nftContract = new ethers.Contract(baseAnswers.contractAddress, ERC1155_ABI, wallet);
        let tokenIdToUse = null;
        let balanceBN;
        if (false) {
          // Si se quisiera permitir ingreso manual, se podría usar tokenIdInput.
          tokenIdToUse = tokenIdInput;
        }
        // Usar la API para obtener tokenIds para ERC1155
        const tokenIds = await fetchTokenIds(wallet.address, baseAnswers.contractAddress);
        if (tokenIds && tokenIds.length > 0) {
          // Se usa el primer tokenId encontrado para ERC1155 (ya que es único en el contrato)
          tokenIdToUse = tokenIds[0];
        } else {
          // Si la API no retorna nada, escanear el rango 0 a MAX_ERC1155_SCAN
          for (let tokenId = 0; tokenId <= MAX_ERC1155_SCAN; tokenId++) {
            balanceBN = await nftContract.balanceOf(wallet.address, tokenId);
            if (balanceBN.toNumber() > 0) {
              tokenIdToUse = tokenId;
              break;
            }
          }
        }
        if (tokenIdToUse === null) {
          console.log(chalk.red(`❌ No ERC1155 tokens found for wallet [${wallet.address}]\n`));
          return;
        }
        console.log(chalk.green(`✅ ERC1155 token found for wallet [${wallet.address}]: Token ID: [${tokenIdToUse}]`));
        // Una vez se detecta el tokenId en la primera wallet, se fija para todas las siguientes
        if (!currentERC1155ID) {
          currentERC1155ID = tokenIdToUse;
        }
        // Obtener la URI solo una vez (si está disponible)
        if (!cachedERC1155URI) {
          try {
            cachedERC1155URI = await nftContract.uri(currentERC1155ID);
            console.log(chalk.cyan(`Token URI for [${currentERC1155ID}]: ${cachedERC1155URI}`));
          } catch (e) {
            console.log(chalk.yellow(`Token URI not available for token ID [${currentERC1155ID}].`));
          }
        }
        balanceBN = await nftContract.balanceOf(wallet.address, currentERC1155ID);
        const overrides = await getTxOverrides(provider);
        try {
          const tx = await nftContract.safeTransferFrom(wallet.address, baseAnswers.destinationWallet, currentERC1155ID, balanceBN, "0x", overrides);
          console.log(chalk.yellow(`🚀 Transfer Tx Sent for ERC1155 Token ID [${currentERC1155ID}]! - [${chain.TX_EXPLORER}${tx.hash}]`));
          const receipt = await tx.wait(1);
          console.log(chalk.magenta(`📦 Tx Confirmed in Block - [${receipt.blockNumber}]\n`));
        } catch (transferError) {
          console.error(chalk.red(`Error transferring ERC1155 token ID [${currentERC1155ID}] from ${wallet.address}: ${transferError.message}\n`));
        }
      }
    } catch (err) {
      console.error(chalk.red(`Error processing wallet ${walletInfo.address}: ${err.message}\n`));
    }
  }

  // Procesar todas las wallets secuencialmente
  for (const walletInfo of walletsToCheck) {
    await processWallet(walletInfo);
  }

  console.log(chalk.green.bold('All wallet checks completed.'));
}

main()
  .then(() => {})
  .catch(err => console.error(chalk.red('Script encountered an error:'), err));
