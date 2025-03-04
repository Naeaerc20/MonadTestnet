// dev.js

const inquirer = require("inquirer");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { ethers } = require("ethers");
const chalk = require("chalk");
const pLimit = require("p-limit");

// Load chain and wallet configuration
const chain = require("../../utils/chain.js");
const wallets = require("../../utils/wallets.json");

// Import factory contract details (FACTORY_CONTRACT and ABI)
const { FACTORY_CONTRACT, ABI } = require("./ABI.js");

// Import API functions from the local scripts folder
const { getTokenURI, getMetadataTokenURI } = require("./scripts/apis.js");

// Deployment constants
const DEFAULT_FEE = ethers.BigNumber.from("30000000000000000"); // e.g., 0.03 MON in wei
const EXTRA_VALUE = ethers.utils.parseUnits("0.02", "ether"); // Extra 0.02 MON
const MIN_INITIAL_PURCHASE = ethers.utils.parseUnits("3", "ether"); // Minimum 3 MON

// Buying transaction variables
const MIN_BUY = ethers.utils.parseUnits("1", "ether");   // 1 MON
const MAX_BUY = ethers.utils.parseUnits("1.3", "ether");   // 1.3 MON
const MAX_TX_PER_WALLET = 1;  // Maximum transactions per wallet

// Create a provider (common for deployment and buying)
const provider = new ethers.providers.JsonRpcProvider(chain.RPC_URL);

// Helper: generate random integer between min and max (inclusive)
function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Helper: download image from URL and return its details
async function downloadImage(url) {
  const response = await axios.get(url, { responseType: "arraybuffer" });
  const ext = path.extname(url).toLowerCase();
  let fileType;
  if (ext === ".png") {
    fileType = "image/png";
  } else if (ext === ".jpg" || ext === ".jpeg") {
    fileType = "image/jpeg";
  } else {
    throw new Error("Unsupported file type. Only PNG and JPEG are accepted.");
  }
  const tempFileName = `temp_${Date.now()}${ext}`;
  const tempFilePath = path.join(__dirname, tempFileName);
  fs.writeFileSync(tempFilePath, response.data);
  const stats = fs.statSync(tempFilePath);
  return { tempFileName, tempFilePath, fileType, fileSize: stats.size };
}

// Main function
async function main() {
  // 1. Ask for the deployer wallet ID.
  const { deployWalletId } = await inquirer.prompt([
    {
      type: "input",
      name: "deployWalletId",
      message: chalk.blue("On which wallet ID would you like to deploy the token?"),
      validate: value => (!isNaN(value) && Number(value) > 0) || "Please enter a valid numeric wallet ID."
    }
  ]);
  const deployWalletEntry = wallets.find(w => w.id === Number(deployWalletId));
  if (!deployWalletEntry) {
    console.error(chalk.blue("❌ Wallet with the specified ID not found."));
    process.exit(1);
  }
  console.log(chalk.green(`✔ You have selected wallet [${deployWalletEntry.address}] for deployment.`));

  // 2. Ask for token logo URL.
  const { logoURL } = await inquirer.prompt([
    {
      type: "input",
      name: "logoURL",
      message: chalk.blue("Please insert your Toin Logo in PNG or JPEG Format (URL):"),
      validate: value => /^https?:\/\//i.test(value) || "Please enter a valid URL."
    }
  ]);
  console.log(chalk.blue("⏳ Downloading token logo from URL..."));
  const { tempFileName, tempFilePath, fileType, fileSize } = await downloadImage(logoURL);
  console.log(chalk.blue("⏳ Uploading token logo and retrieving image URI..."));
  const imageURI = await getTokenURI(tempFileName, fileSize, fileType);
  console.log(chalk.green(`✔ Image URI received: ${imageURI}`));
  fs.unlinkSync(tempFilePath);

  // 3. Ask for token details.
  const answers = await inquirer.prompt([
    { type: "input", name: "tokenName", message: chalk.blue("Please insert your Toin Name:") },
    { type: "input", name: "tokenSymbol", message: chalk.blue("Please insert your Token Symbol:") },
    { type: "input", name: "tokenDescription", message: chalk.blue("Please insert your Token Description:") },
    {
      type: "input",
      name: "initialPurchase",
      message: chalk.blue("How much will be your initial purchase? (in MON)"),
      validate: value => (!isNaN(parseFloat(value)) && parseFloat(value) > 0) || "Enter a valid number greater than 0."
    }
  ]);
  
  console.log(chalk.blue("⏳ Creating and uploading metadata..."));
  const metadataTokenURI = await getMetadataTokenURI(
    answers.tokenName,
    answers.tokenSymbol,
    imageURI,
    answers.tokenDescription
  );
  console.log(chalk.green(`✔ Metadata Token URI received: ${metadataTokenURI}`));

  const amountIn = ethers.utils.parseUnits(answers.initialPurchase, "ether");
  if (amountIn.lt(MIN_INITIAL_PURCHASE)) {
    console.error(chalk.blue(`❌ Initial purchase must be at least 3 MON. Provided: ${answers.initialPurchase} MON`));
    process.exit(1);
  }

  console.log(chalk.blue(`🚀 Deploying Token - Name: [${answers.tokenName}] Symbol: [${answers.tokenSymbol}] with Initial Purchase of [${ethers.utils.formatUnits(amountIn, "ether")} MON]`));
  const deployProvider = new ethers.providers.JsonRpcProvider(chain.RPC_URL);
  const deployWallet = new ethers.Wallet(deployWalletEntry.privateKey, deployProvider);
  const randomGasLimit = Math.floor(Math.random() * (4000000 - 3000000 + 1)) + 3000000;
  const latestBlock = await deployProvider.getBlock("latest");
  const baseFee = latestBlock.baseFeePerGas;
  const adjustedFee = baseFee.mul(105).div(100);
  const factoryContract = new ethers.Contract(FACTORY_CONTRACT, ABI, deployWallet);

  // Calculate total value: amountIn + DEFAULT_FEE + EXTRA_VALUE
  const totalValue = amountIn.add(DEFAULT_FEE).add(EXTRA_VALUE);
  const tx = await factoryContract.createCurve(
    deployWallet.address,
    answers.tokenName,
    answers.tokenSymbol,
    metadataTokenURI,
    amountIn,
    DEFAULT_FEE,
    {
      gasLimit: randomGasLimit,
      maxFeePerGas: adjustedFee,
      maxPriorityFeePerGas: adjustedFee,
      value: totalValue
    }
  );
  console.log(chalk.green(`🚀 Deploy Tx Hash Sent! - [${chain.TX_EXPLORER}${tx.hash}]`));
  const receipt = await tx.wait();
  console.log(chalk.green(`✅ Tx Confirmed in Block - [${receipt.blockNumber}]`));
  console.log(chalk.green("🎉 Token Successfully Deployed"));

  // Retrieve deployed token address (assumes the token address is the second element in the return tuple)
  const deployedToken = receipt.args ? receipt.args.token : null;
  if (!deployedToken) {
    console.error(chalk.blue("❌ Could not retrieve the deployed token address from the transaction receipt."));
    process.exit(1);
  }
  console.log(chalk.green(`Deployed Token Address: ${deployedToken}`));

  // 4. Now, ask for buyer wallet IDs (for buying the deployed token)
  const { buyerWalletIDs } = await inquirer.prompt([
    {
      type: "input",
      name: "buyerWalletIDs",
      message: chalk.blue("Enter wallet IDs for buying the deployed token (separated by spaces):"),
      validate: value => {
        const ids = value.split(/\s+/).map(Number);
        if (ids.some(isNaN)) return "Please enter valid wallet IDs.";
        return true;
      }
    }
  ]);
  const buyerIDs = buyerWalletIDs.split(/\s+/).map(Number);
  const buyerWallets = wallets.filter(w => buyerIDs.includes(w.id));
  if (buyerWallets.length === 0) {
    console.error(chalk.blue("❌ No valid buyer wallets found."));
    process.exit(1);
  }

  // Process buying transactions concurrently (up to 10 at a time)
  const limit = pLimit(10);
  const buyPromises = buyerWallets.map(wallet =>
    limit(async () => {
      for (let i = 0; i < MAX_TX_PER_WALLET; i++) {
        const buyAmount = getRandomBuyAmount(); // random between MIN_BUY and MAX_BUY
        const fee = buyAmount.mul(1).div(100); // Fee = 1% of buyAmount
        const amountOutMin = 0;
        const to = wallet.address;
        const deadline = Math.floor(Date.now() / 1000) + 6 * 3600;
        const totalValue = buyAmount.add(fee);
        const randomGasLimit = Math.floor(Math.random() * (380000 - 280000 + 1)) + 280000;
        const provider = new ethers.providers.JsonRpcProvider(chain.RPC_URL);
        const signer = new ethers.Wallet(wallet.privateKey, provider);
        const routerContract = new ethers.Contract(ROUTER_CONTRACT, ABI, signer);
        const latestBlock = await provider.getBlock("latest");
        const adjustedFee = latestBlock.baseFeePerGas.mul(105).div(100);
        
        try {
          console.log(`Insider ID - [${wallet.id}] is buying the deployed token...`);
          const tx = await routerContract.protectBuy(
            buyAmount,
            amountOutMin,
            fee,
            deployedToken,
            to,
            deadline,
            {
              value: totalValue,
              gasLimit: randomGasLimit,
              maxFeePerGas: adjustedFee,
              maxPriorityFeePerGas: adjustedFee
            }
          );
          console.log(`Tx Sent! - [${chain.TX_EXPLORER}${tx.hash}]`);
          const receipt = await tx.wait();
          console.log(`Tx Confirmed in Block - [${receipt.blockNumber}] for Wallet [${wallet.address}]`);
        } catch (error) {
          console.log(`❌ Error in buying for wallet [${wallet.address}]: ${error}`);
        }
      }
    })
  );
  await Promise.all(buyPromises);
}

main();
