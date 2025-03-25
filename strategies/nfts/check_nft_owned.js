const fs = require('fs');
const path = require('path');
const axios = require('axios');
const colors = require('colors');
const inquirer = require('inquirer');
const wallets = require('../../utils/wallets.json');

let API_KEY = "";
const keyFile = path.join(__dirname, 'apikey.txt');

if (API_KEY === "" && fs.existsSync(keyFile)) {
  API_KEY = fs.readFileSync(keyFile, 'utf-8').trim();
}

async function getApiKeyIfNeeded() {
  if (API_KEY === "") {
    const { apiKeyInput } = await inquirer.prompt([
      {
        type: 'input',
        name: 'apiKeyInput',
        message: 'API KEY Not Found, Please Insert your API Key from Alchemy (Make sure Monad Testnet is enabled).',
        validate: input => input ? true : 'API Key cannot be empty'
      }
    ]);
    API_KEY = apiKeyInput.trim();
    fs.writeFileSync(keyFile, API_KEY, 'utf-8');
  }
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function fetchNFTsForOwner(walletAddress) {
  const url = `https://monad-testnet.g.alchemy.com/nft/v3/${API_KEY}/getNFTsForOwner?owner=${walletAddress}&withMetadata=true&pageSize=100`;
  try {
    const response = await axios.get(url, { headers: { accept: 'application/json' } });
    return response.data;
  } catch (err) {
    if (err.response && err.response.data) {
      console.error(`❌ Error fetching NFTs for wallet ${walletAddress}: ${JSON.stringify(err.response.data)}`.red);
    } else {
      console.error(`❌ Error fetching NFTs for wallet ${walletAddress}: ${err.message}`.red);
    }
    return null;
  }
}

async function checkAlchemyNFTs() {
  for (const wallet of wallets) {
    console.log(`🔑 Wallet [${wallet.id}] (${wallet.address}) NFTs:`.green);
    const apiResponse = await fetchNFTsForOwner(wallet.address);
    if (!apiResponse) {
      console.log("❌ API error for this wallet.".red);
      await sleep(1000);
      continue;
    }
    const ownedNfts = apiResponse.ownedNfts || [];
    if (ownedNfts.length === 0) {
      console.log("🚫 None Found".yellow);
    } else {
      let filteredNfts = ownedNfts;
      if (global.filterContract) {
        filteredNfts = ownedNfts.filter(nft =>
          nft.contract && nft.contract.address &&
          nft.contract.address.toLowerCase() === global.filterContract.toLowerCase()
        );
        if (filteredNfts.length === 0) {
          console.log(`⚠️  Wallet [${wallet.address}] doesn't own any NFT of this collection.`.red);
        }
      }
      filteredNfts.forEach(nft => {
        const contract = nft.contract && nft.contract.address ? nft.contract.address : "N/A";
        const name = nft.name || (nft.metadata && nft.metadata.name) || "N/A";
        const tokenType = nft.tokenType || "N/A";
        const tokenId = nft.tokenId || "N/A";
        const balance = nft.balance || "N/A";
        const floorPrice = (nft.contract && nft.contract.openSeaMetadata && nft.contract.openSeaMetadata.floorPrice) 
          ? nft.contract.openSeaMetadata.floorPrice 
          : "N/A";
        console.log(
          `• Contract: ${contract.cyan}, Name: ${name.magenta}, tokenType: ${tokenType.yellow}, tokenId: ${tokenId.blue}, Balance: ${balance.green}, Floor Price: ${floorPrice.toString().red}`
        );
      });
    }
    console.log("");
    await sleep(1000);
  }
  console.log("✅ Done checking Alchemy NFTs.".green);
  process.exit(0);
}

async function main() {
  await getApiKeyIfNeeded();
  const { filterChoice } = await inquirer.prompt([
    {
      type: 'input',
      name: 'filterChoice',
      message: 'Do you wish to filter specific collection (y/n)?',
      validate: input => ['y', 'n', 'Y', 'N'].includes(input) ? true : 'Please enter y or n'
    }
  ]);
  
  if (filterChoice.toLowerCase() === 'y') {
    const { contractAddress } = await inquirer.prompt([
      {
        type: 'input',
        name: 'contractAddress',
        message: 'Enter the NFT contract address to filter:',
        validate: input => input ? true : 'Please enter a contract address'
      }
    ]);
    global.filterContract = contractAddress.trim();
  }
  
  await checkAlchemyNFTs();
}

main().catch(err => {
  console.error("❌ Fatal Error:", err);
  process.exit(1);
});
