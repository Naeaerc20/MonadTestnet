const { ethers } = require("ethers");
const inquirer = require("inquirer");
const chalk = require("chalk");
const pLimit = require("p-limit");
const chainConfig = require("../../../utils/chain.js");
const walletsData = require("../../../utils/wallets.json");
const { ABI } = require("./ABI");

function getRandomGasLimit(min = 180000, max = 280000) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function formatTimeComponents(date) {
  const hours = date.getUTCHours().toString().padStart(2, "0");
  const minutes = date.getUTCMinutes().toString().padStart(2, "0");
  const seconds = date.getUTCSeconds().toString().padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}

function formatDateComponents(date) {
  const day = date.getUTCDate().toString().padStart(2, "0");
  const month = (date.getUTCMonth() + 1).toString().padStart(2, "0");
  const year = date.getUTCFullYear();
  return `${day}/${month}/${year}`;
}

async function getConfigWithFallback(contract) {
  let config;
  try {
    config = await contract.getConfig();
    if (!config.publicStage.price.eq(0)) {
      console.log(chalk.green("getConfig() without parameters succeeded."));
      return { config, variant: "fourParams" };
    } else {
      console.error(chalk.red("getConfig() without parameters returned price 0, trying fallback tokenIds."));
    }
  } catch (err) {
    console.error(chalk.red("getConfig() without parameters failed, trying fallback tokenIds."));
  }
  
  let fallbackConfig;
  const fallbackIds = [0, 1, 2, 3];
  for (let id of fallbackIds) {
    try {
      fallbackConfig = await contract["getConfig(uint256)"](id);
      console.log(chalk.green(`getConfig(uint256) with tokenId ${id} succeeded.`));
      if (!fallbackConfig.publicStage.price.eq(0)) {
        return { config: fallbackConfig, variant: "fourParams" };
      } else {
        console.error(chalk.red(`getConfig(uint256) with tokenId ${id} returned price 0.`));
      }
    } catch (err) {
      console.error(chalk.red(`getConfig(uint256) with tokenId ${id} failed.`));
    }
  }
  if (fallbackConfig) {
    console.log(chalk.yellow("All fallback getConfig calls returned price 0. Using last returned config."));
    return { config: fallbackConfig, variant: "fourParams" };
  } else {
    throw new Error("Unable to retrieve configuration using getConfig fallback.");
  }
}

async function sendMint(contractAddress, wallet, gasLimit, fee, explorerUrl, walletId, initialMintVariant, mintPrice) {
  const contractWithWallet = new ethers.Contract(contractAddress, ABI, wallet);
  console.log(chalk.blue(`Wallet ID [${walletId}] is minting 1 NFT(s) using ${initialMintVariant} as first option.`));
  let tx;
  try {
    if (initialMintVariant === "fourParams") {
      tx = await contractWithWallet["mintPublic(address,uint256,uint256,bytes)"](
        wallet.address, 0, 1, "0x",
        { gasLimit, maxFeePerGas: fee, maxPriorityFeePerGas: fee, value: mintPrice }
      );
    } else {
      tx = await contractWithWallet["mintPublic(address,uint256)"](
        wallet.address, 1,
        { gasLimit, maxFeePerGas: fee, maxPriorityFeePerGas: fee, value: mintPrice }
      );
    }
    console.log(chalk.green(`Mint transaction sent! Wallet ID [${walletId}] - [${explorerUrl}${tx.hash}]`));
    const receipt = await tx.wait();
    console.log(chalk.magenta(`Transaction confirmed in Block [${receipt.blockNumber}] for Wallet ID [${walletId}].`));
  } catch (err) {
    if (err.code === ethers.errors.CALL_EXCEPTION || err.message.includes("CALL_EXCEPTION")) {
      if (initialMintVariant === "fourParams") {
        console.error(chalk.red(`CALL_EXCEPTION for Wallet [${walletId}] using fourParams. Retrying with twoParams...`));
        try {
          tx = await contractWithWallet["mintPublic(address,uint256)"](
            wallet.address, 1,
            { gasLimit, maxFeePerGas: fee, maxPriorityFeePerGas: fee, value: mintPrice }
          );
          console.log(chalk.green(`Mint transaction sent! Wallet ID [${walletId}] - [${explorerUrl}${tx.hash}]`));
          const receipt = await tx.wait();
          console.log(chalk.magenta(`Transaction confirmed in Block [${receipt.blockNumber}] for Wallet ID [${walletId}].`));
        } catch (retryErr) {
          console.error(chalk.red(`CALL_EXCEPTION for Wallet [${walletId}] on retry with twoParams.`));
        }
      } else if (initialMintVariant === "twoParams") {
        console.error(chalk.red(`CALL_EXCEPTION for Wallet [${walletId}] using twoParams. Retrying with fourParams...`));
        try {
          tx = await contractWithWallet["mintPublic(address,uint256,uint256,bytes)"](
            wallet.address, 0, 1, "0x",
            { gasLimit, maxFeePerGas: fee, maxPriorityFeePerGas: fee, value: mintPrice }
          );
          console.log(chalk.green(`Mint transaction sent! Wallet ID [${walletId}] - [${explorerUrl}${tx.hash}]`));
          const receipt = await tx.wait();
          console.log(chalk.magenta(`Transaction confirmed in Block [${receipt.blockNumber}] for Wallet ID [${walletId}].`));
        } catch (retryErr) {
          console.error(chalk.red(`CALL_EXCEPTION for Wallet [${walletId}] on retry with fourParams.`));
        }
      }
    } else if (err.message.includes("INSUFFICIENT_FUNDS")) {
      console.error(chalk.yellow(`Wallet [${walletId}] has insufficient funds. Skipping...`));
    } else {
      console.error(chalk.red(`Error minting with Wallet [${walletId}]:`), err);
    }
  }
}

async function main() {
  const provider = new ethers.providers.JsonRpcProvider(chainConfig.RPC_URL, chainConfig.CHAIN_ID);
  const inputResponses = await inquirer.prompt([
    { 
      type: "list", 
      name: "mintOption", 
      message: "Choose your Minting Mode:", 
      choices: ["Instant Mint", "Scheduled Mint"] 
    },
    { 
      type: "input", 
      name: "contractAddress", 
      message: "Please enter the NFT contract address you'd like to mint:" 
    },
    { 
      type: "confirm", 
      name: "useContractPrice", 
      message: "Do you want to retrieve the MINT_PRICE from the contract?", 
      default: true 
    },
    { 
      type: "list", 
      name: "walletChoice", 
      message: "Which wallets would you like to use for minting?", 
      choices: ["All wallets", "Specific IDs"] 
    },
    { 
      type: "input", 
      name: "walletIDs", 
      message: "Enter wallet IDs separated by spaces:", 
      when: answers => answers.walletChoice === "Specific IDs" 
    },
    { 
      type: "list", 
      name: "initialMintVariant", 
      message: "Choose the order of parameters to use first:", 
      choices: ["TwoParams", "FourParams"] 
    }
  ]);

  let finalConfig = null;
  if (inputResponses.useContractPrice) {
    try {
      const contractForConfig = new ethers.Contract(inputResponses.contractAddress, ABI, provider);
      const cfgResult = await getConfigWithFallback(contractForConfig);
      if (cfgResult) {
        finalConfig = cfgResult.config;
        console.log(chalk.green(`MINT_PRICE obtained from contract - [${ethers.utils.formatEther(finalConfig.publicStage.price)}] MON`));
      }
    } catch (err) {
      console.error(chalk.red("Error retrieving config from contract. We'll ask for manual MINT_PRICE."));
    }
  } else {
    console.log(chalk.yellow("Not retrieving MINT_PRICE from contract; manual input will be requested."));
  }

  if (finalConfig) {
    finalConfig = {
      publicStage: {
        startTime: finalConfig.publicStage.startTime,
        endTime: finalConfig.publicStage.endTime,
        price: finalConfig.publicStage.price
      }
    };
  }

  let mintPrice;
  if (finalConfig && !finalConfig.publicStage.price.eq(0)) {
    mintPrice = finalConfig.publicStage.price;
  } else {
    console.log(chalk.red("MINT_PRICE was not obtained from the contract or is 0. Please insert MINT_PRICE:"));
    const { manualPrice } = await inquirer.prompt([
      { 
        type: "input", 
        name: "manualPrice", 
        message: "Please insert MINT_PRICE:", 
        validate: input => !isNaN(input) && Number(input) >= 0 
      }
    ]);
    mintPrice = ethers.utils.parseEther(manualPrice.toString());
  }
  
  console.log(chalk.blue(`MINT_PRICE is set to - [${ethers.utils.formatEther(mintPrice)}] MON`));

  let startTime;
  let scheduledDate;
  if (inputResponses.mintOption === "Scheduled Mint") {
    if (finalConfig && !finalConfig.publicStage.startTime.eq(0)) {
      startTime = finalConfig.publicStage.startTime.toNumber();
      scheduledDate = new Date(startTime * 1000);
    } else {
      const timeInput = await inquirer.prompt([
        { 
          type: "input", 
          name: "hour", 
          message: "Please enter the Minting Start Time (in UTC format)\nHour (24h):" 
        },
        { 
          type: "input", 
          name: "minute", 
          message: "Minute:" 
        },
        { 
          type: "input", 
          name: "second", 
          message: "Second:" 
        }
      ]);
      const currentDate = new Date();
      scheduledDate = new Date(Date.UTC(
        currentDate.getUTCFullYear(),
        currentDate.getUTCMonth(),
        currentDate.getUTCDate(),
        Number(timeInput.hour),
        Number(timeInput.minute),
        Number(timeInput.second)
      ));
      // If the specified time has already passed today, schedule for the next day.
      if (scheduledDate.getTime() <= currentDate.getTime()) {
         scheduledDate.setUTCDate(scheduledDate.getUTCDate() + 1);
      }
      startTime = Math.floor(scheduledDate.getTime() / 1000);
    }

    const currentTime = Math.floor(Date.now() / 1000);
    if (currentTime < startTime) {
      const delay = (startTime - currentTime) * 1000;
      const formattedTime = formatTimeComponents(scheduledDate);
      const formattedDate = formatDateComponents(scheduledDate);
      console.log(chalk.yellow("Scheduling Mint..."));
      console.log(chalk.yellow(`Mint has been scheduled for - [${formattedTime}] UTC on [${formattedDate}]`));
      await new Promise(resolve => setTimeout(resolve, delay));
      console.log(chalk.yellow("Mint time reached! Starting mint..."));
    } else {
      console.log(chalk.yellow("Mint time has already passed. Starting mint immediately..."));
    }
  }

  const latestBlock = await provider.getBlock("latest");
  const baseFee = latestBlock.baseFeePerGas;
  const fee = baseFee.mul(125).div(100);

  let selectedWallets;
  if (inputResponses.walletChoice === "All wallets") {
    selectedWallets = walletsData;
  } else {
    const ids = inputResponses.walletIDs.split(" ").map(id => Number(id));
    selectedWallets = walletsData.filter(w => ids.includes(w.id));
  }

  const limit = pLimit(20);
  const explorerUrl = chainConfig.TX_EXPLORER;

  const tasks = selectedWallets.map(walletData =>
    limit(async () => {
      const wallet = new ethers.Wallet(walletData.privateKey, provider);
      const individualGasLimit = getRandomGasLimit();
      await sendMint(
        inputResponses.contractAddress,
        wallet,
        individualGasLimit,
        fee,
        explorerUrl,
        walletData.id,
        inputResponses.initialMintVariant,
        mintPrice
      );
    })
  );

  await Promise.all(tasks);
}

main().catch(err => {
  console.error(chalk.red("Execution error:"), err);
});
