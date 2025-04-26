const inquirer = require('inquirer');
const figlet = require('figlet');
const { spawn } = require('child_process');
const colors = require('colors');
const clear = require('console-clear');
const fs = require('fs');

process.on('SIGINT', () => {
  console.log('\nExiting...'.green);
  process.exit(0);
});

async function pause() {
  await inquirer.prompt([
    { type: 'input', name: 'continue', message: 'Press ENTER to return to the main menu...' },
  ]);
}

function runScript(scriptPath) {
  return new Promise((resolve) => {
    const child = spawn('node', [scriptPath], { stdio: 'inherit' });
    child.on('close', () => resolve());
  });
}

async function specificAppMenu() {
  const { appChoice } = await inquirer.prompt([
    {
      type: 'list',
      name: 'appChoice',
      message: 'Select an App:',
      choices: [
        { name: '1. Nad.Fun', value: 'nadfun' },
        { name: '2. MagicEden', value: 'magiceden' },
        { name: '3. Nad.Domains', value: 'naddomains' },
        { name: '4. Manage Faucet', value: 'manageFaucet' },
        { name: '5. Transfer NFTs', value: 'transferNFTs' },
        { name: '6. Orochi Network', value: 'orochiNetwork' },
      ],
    },
  ]);

  if (appChoice === 'nadfun') {
    const { appOption } = await inquirer.prompt([
      {
        type: 'list',
        name: 'appOption',
        message: 'What would you like to do?',
        choices: [
          { name: '1. Launch a Token', value: 'launchToken' },
          { name: '2. Execute Swaps', value: 'executeSwaps' },
          { name: '3. Snipe Tokens', value: 'snipeTokens' },
          { name: '4. Launch a Token with Insider Txs', value: 'launchInsider' },
          { name: '5. Swap Tokens [Basic Format]', value: 'basicSwap' },
          { name: '6. Swap available assets to MON', value: 'liquidateNad' },
        ],
      },
    ]);
    switch (appOption) {
      case 'launchToken':
        console.log('Launching Token...'.green);
        await runScript('actions/Nad.Fun/deploy.js');
        break;
      case 'executeSwaps':
        console.log('Executing Swaps...'.green);
        await runScript('actions/Nad.Fun/swap.js');
        break;
      case 'snipeTokens':
        console.log('Snipe Tokens...'.green);
        await runScript('actions/Nad.Fun/snipe.js');
        break;
      case 'launchInsider':
        console.log('Launching Token with Insider Txs...'.green);
        await runScript('actions/Nad.Fun/dev.js');
        break;
      case 'basicSwap':
        console.log('Launching Basic Swap...'.green);
        await runScript('actions/Nad.Fun/basicSwap.js');
        break;
      case 'liquidateNad':
        console.log('Swapping available assets to MON via Nad.Fun...'.green);
        await runScript('actions/Nad.Fun/liquidate.js');
        break;
      default:
        break;
    }
  } else if (appChoice === 'magiceden') {
    const { magicEdenOption } = await inquirer.prompt([
      {
        type: 'list',
        name: 'magicEdenOption',
        message: 'What would you like to do?',
        choices: [
          { name: '1. Mint NFTs', value: 'mintNFTs' },
          { name: '2. Deploy NFT Collection', value: 'deployNFT' },
        ],
      },
    ]);
    switch (magicEdenOption) {
      case 'mintNFTs':
        console.log('Launching MagicEden: Mint NFTs...'.green);
        await runScript('actions/NFTs-Mint/MagicEden/mint.js');
        break;
      case 'deployNFT':
        console.log('Launching MagicEden: Deploy NFT Collection...'.green);
        await runScript('actions/NFTs-Mint/MagicEden/deploy.js');
        break;
      default:
        break;
    }
  } else if (appChoice === 'naddomains') {
    console.log('Launching Nad.Domains...'.green);
    await runScript('actions/Nad.Domains/index.js');
  } else if (appChoice === 'manageFaucet') {
    console.log('Managing Faucet...'.green);
    await runScript('strategies/for_faucet/transfers.js');
  } else if (appChoice === 'transferNFTs') {
    console.log('Transferring NFTs...'.green);
    await runScript('strategies/nfts/transfers.js');
  } else if (appChoice === 'orochiNetwork') {
    const { orochiOption } = await inquirer.prompt([
      {
        type: 'list',
        name: 'orochiOption',
        message: 'What would you like to do?',
        choices: [
          { name: '1. Use the App', value: 'useApp' },
          { name: '2. How to find Bearer Tokens', value: 'howToBearer' },
        ],
      },
    ]);

    if (orochiOption === 'useApp') {
      console.log('Launching Orochi Network App...'.green);
      await runScript('actions/OrochiNetwork/index.js');
    } else if (orochiOption === 'howToBearer') {
      const info = fs.readFileSync('actions/OrochiNetwork/instructions.txt', 'utf-8');
      console.log('\n' + info + '\n');
    }
  }
  await pause();
}

async function mainMenu() {
  clear();
  const title = figlet.textSync('MONAD', { horizontalLayout: 'full' });
  console.log(title.green);
  console.log('Script created by Naeaex'.green);
  console.log('Follow me on X - x.com/naeaexeth - Github - github.com/Naeaerc20'.green);
  console.log();

  const { option } = await inquirer.prompt([
    {
      type: 'list',
      name: 'option',
      message: 'Select an option:',
      choices: [
        { name: '1. Claim Faucet', value: 'claimFaucet' },
        { name: '2. Execute Swaps', value: 'executeSwaps' },
        { name: '3. Manage Liquidity (coming soon...)', value: 'manageLiquidity' },
        { name: '4. Stake Assets', value: 'stakeAssets' },
        { name: '5. Deploy a Contract', value: 'deployContract' },
        { name: '6. Deploy a Token', value: 'deployToken' },
        { name: '7. Deploy NFT Collection', value: 'deployNFT' },
        { name: '8. Use Specific App', value: 'specificApp' },
        { name: '9. Check Wallet Stuff', value: 'checkWalletStuff' },
        { name: '0. Exit', value: 'exit' },
      ],
    },
  ]);

  switch (option) {
    case 'claimFaucet': {
      const { faucetChoice } = await inquirer.prompt([
        {
          type: 'list',
          name: 'faucetChoice',
          message: 'Select Faucet:',
          choices: [
            { name: '1. Official Faucet', value: 'officialFaucet' },
            { name: '2. Morkie Faucet', value: 'morkieFaucet' },
            { name: '3. Owlto Faucet (coming soon)', value: 'owltoFaucet' },
            { name: '4. Faucet Trade', value: 'faucetTrade' },
          ],
        },
      ]);
      if (faucetChoice === 'officialFaucet') {
        console.log('Launching Official Faucet...'.green);
        await runScript('faucets/official_faucet/claim.js');
      } else if (faucetChoice === 'morkieFaucet') {
        console.log('Launching Morkie Faucet...'.green);
        await runScript('faucets/morkie_faucet/claim.js');
      } else if (faucetChoice === 'faucetTrade') {
        console.log('Launching Faucet Trade...'.green);
        await runScript('faucets/faucet.trade/index.js');
      } else {
        console.log('Owlto Faucet coming soon...'.green);
      }
      await pause();
      break;
    }

    case 'executeSwaps': {
      const { swapChoice } = await inquirer.prompt([
        {
          type: 'list',
          name: 'swapChoice',
          message: 'Where would you like to swap assets?',
          choices: [
            { name: '1. BeanSwap', value: 'beanSwap' },
            { name: '2. Ambient Finance (coming soon...)', value: 'ambientFinance' },
            { name: '3. KuruSwap', value: 'kuruSwap' },
            { name: '4. OctoSwap', value: 'octoSwap' },
          ],
        },
      ]);
      if (swapChoice === 'beanSwap') {
        const { beanSwapMode } = await inquirer.prompt([
          {
            type: 'list',
            name: 'beanSwapMode',
            message: 'Select swap mode for BeanSwap:',
            choices: [
              { name: '1. Manual Swaps', value: 'manual' },
              { name: '2. Automatic Swaps', value: 'automatic' },
              { name: '3. Swap all assets for MON', value: 'liquidateBean' },
            ],
          },
        ]);
        if (beanSwapMode === 'manual') {
          console.log('Launching Manual BeanSwap...'.green);
          await runScript('actions/BeanSwap/swap.js');
        } else if (beanSwapMode === 'automatic') {
          console.log('Launching Automatic BeanSwap...'.green);
          await runScript('actions/BeanSwap/random.js');
        } else if (beanSwapMode === 'liquidateBean') {
          console.log('Swapping all assets for MON via BeanSwap...'.green);
          await runScript('actions/BeanSwap/liquidate.js');
        }
      } else if (swapChoice === 'ambientFinance') {
        console.log('Ambient Finance coming soon...'.green);
      } else if (swapChoice === 'kuruSwap') {
        const { kuruSwapMode } = await inquirer.prompt([
          {
            type: 'list',
            name: 'kuruSwapMode',
            message: 'Select swap mode for KuruSwap:',
            choices: [
              { name: '1. Manual Swaps', value: 'manual' },
              { name: '2. Automatic Swaps', value: 'automatic' },
            ],
          },
        ]);
        if (kuruSwapMode === 'manual') {
          console.log('Launching Manual KuruSwap...'.green);
          await runScript('actions/KuruSwap/swap.js');
        } else {
          console.log('Launching Automatic KuruSwap...'.green);
          await runScript('actions/KuruSwap/random.js');
        }
      } else if (swapChoice === 'octoSwap') {
        const { octoSwapMode } = await inquirer.prompt([
          {
            type: 'list',
            name: 'octoSwapMode',
            message: 'Select swap mode for OctoSwap:',
            choices: [
              { name: '1. Manual Swaps', value: 'manual' },
              { name: '2. Automatic Swaps', value: 'automatic' },
              { name: '3. Swap all assets for MON', value: 'liquidateOcto' },
            ],
          },
        ]);
        if (octoSwapMode === 'manual') {
          console.log('Launching Manual OctoSwap...'.green);
          await runScript('actions/OctoSwap/swap.js');
        } else if (octoSwapMode === 'automatic') {
          console.log('Launching Automatic OctoSwap...'.green);
          await runScript('actions/OctoSwap/random.js');
        } else if (octoSwapMode === 'liquidateOcto') {
          console.log('Swapping all assets for MON via OctoSwap...'.green);
          await runScript('actions/OctoSwap/liquidate.js');
        }
      }
      await pause();
      break;
    }

    case 'manageLiquidity':
      console.log('Feature coming soon...'.green);
      await pause();
      break;

    case 'stakeAssets': {
      const { stakeChoice } = await inquirer.prompt([
        {
          type: 'list',
          name: 'stakeChoice',
          message: 'Where would you like to stake assets?',
          choices: [
            { name: '1. Multipli', value: 'multipli' },
            { name: '2. Apriori', value: 'apriori' },
            { name: '3. Kintzu', value: 'kintzu' },
            { name: '4. Magma', value: 'magma' },
          ],
        },
      ]);
      switch (stakeChoice) {
        case 'multipli':
          console.log('Launching Multipli...'.green);
          await runScript('actions/Multipli/index.js');
          break;
        case 'apriori':
          console.log('Launching Apriori...'.green);
          await runScript('actions/Apriori/index.js');
          break;
        case 'kintzu':
          console.log('Launching Kintzu...'.green);
          await runScript('actions/Kintzu/index.js');
          break;
        case 'magma':
          console.log('Launching Magma...'.green);
          await runScript('actions/Magma/index.js');
          break;
        default:
          console.log('Invalid option, coming soon...'.green);
          break;
      }
      await pause();
      break;
    }

    case 'deployContract':
      console.log('Launching Deploy Contract...'.green);
      await runScript('actions/deploy_contract/index.js');
      await pause();
      break;

    case 'deployToken':
      console.log('Launching Deploy Token...'.green);
      await runScript('actions/deploy_contract/launch.js');
      await pause();
      break;

    case 'deployNFT':
      console.log('Launching Deploy NFT Collection...'.green);
      await runScript('actions/deploy_contract/NFTs/deploy.js');
      await pause();
      break;

    case 'specificApp':
      await specificAppMenu();
      break;

    case 'checkWalletStuff': {
      const { walletInfo } = await inquirer.prompt([
        {
          type: 'list',
          name: 'walletInfo',
          message: 'What would you like to know?',
          choices: [
            { name: "1. Number of Tx's Made", value: 'txCount' },
            { name: '2. Current Balance Amount', value: 'balance' },
            { name: '3. Check NFTs Owneds', value: 'nftOwned' },
          ],
        },
      ]);
      if (walletInfo === 'txCount') {
        console.log('Checking number of transactions...'.green);
        await runScript('utils/txChecker.js');
      } else if (walletInfo === 'balance') {
        console.log('Checking current balance...'.green);
        await runScript('utils/balanceChecker.js');
      } else if (walletInfo === 'nftOwned') {
        console.log('Checking NFTs Owneds...'.green);
        await runScript('strategies/nfts/check_nft_owned.js');
      }
      await pause();
      break;
    }

    case 'exit':
      console.log('Exiting...'.green);
      process.exit(0);

    default:
      break;
  }
  mainMenu();
}

mainMenu();
