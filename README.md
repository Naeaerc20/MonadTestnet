## Monad Testnet

Welcome to Monad Testnet, this script will help you to be well positioned for future Testnet launch implementing multi Faucet claim,
Testnet Apps Interactions, Protocols, Contract Deployment, etc... All possible stuff related to Monad

``` bash

MonadTestnet/
├── actions/
│   ├── deploy_contract/
│   │   ├── index.js          # Main script to compile and deploy simple contracts on testnet.
│   │   ├── contracts.sol     # Solidity contracts (up to 10 simple contracts).
│   │   ├── ABI.js            # Exports the ABI for a sample contract.
│   │   ├── launch.js         # Deployment script for tokens; prompts for token parameters.
│   │   └── NFTs/
│   │       ├── deploy.js     # Interactive NFT deployment script (prompts for collection name, ticket, and max supply).
│   │       └── nft.sol       # NFT contract implementing basic functions (mint, burn, transfer, etc.).
│   ├── StakeStone/
│   │   ├── index.js          # StakeStone module main script (to be implemented).
│   │   └── ABI.js            # ABI definitions for StakeStone contracts (to be implemented).
│   ├── Multipli/
│   │   ├── index.js          # Multipli module main script (handles token claims and asset staking).
│   │   └── ABI.js            # ABI definitions for Multipli contracts (to be implemented).
│   ├── Ambient-Finance/
│   │   ├── index.js          # Main script for Ambient-Finance module (to be implemented).
│   │   └── ABI.js            # ABI definitions for Ambient-Finance contracts (to be implemented).
│   ├── Apriori/
│   │   ├── index.js          # Main script for stake_apr.io module (handles staking & APR token operations).
│   │   ├── ABI.js            # ABI definitions for Apriori contracts (implemented).
│   │   ├── faucet.js         # Faucet script for Apriori (to be implemented).
│   │   └── scripts/          # Additional scripts for Apriori (empty for now).
│   ├── NFTs-Mint/
│   │   ├── MagicEden/
│   │   │   ├── ABI.js        # ABI definitions for MagicEden integration (getConfig(), mintPublic(params), etc.).
│   │   │   ├── mint.js       # Main script for MagicEden NFT minting.
│   │   │   ├── deploy.js     # Dedicated script to launch NFT collections on MagicEden with different Mint Phases.
│   │   │   └── scripts/
│   │   │       └── apis.js   # API calls for MagicEden integration.
│   │   └── Testnet.Free/
│   │       ├── ABI.js        # ABI definitions for Testnet.Free minting (to be implemented).
│   │       └── index.js      # Main script for Testnet.Free NFT minting.
│   ├── BeanSwap/
│   │   ├── ABI.js            # Exports ABI definitions for Bean-Exchange & token + router contracts.
│   │   ├── swap.js           # Interactive swap script with token approvals, dynamic gas settings, and support for wrapping/unwrapping MON/WMON and custom tokens.
│   │   ├── liquidity.js      # To be implemented – Script for managing liquidity operations.
│   │   ├── perps.js          # To be implemented – Script for handling perpetual contracts trading.
│   │   ├── random.js         # Random swap script for BeanSwap (performs random swaps automatically).
│   │   └── liquidate.js      # Dedicated script to swap all available tokens back to MON.
│   ├── Kintzu/
│   │   ├── index.js          # Main script for the Kintzu module.
│   │   └── ABI.js            # ABI definitions for Kintzu contracts.
│   ├── Synnax/
│   │   ├── index.js          # Main script for the Synnax module.
│   │   └── ABI.js            # ABI definitions for Synnax contracts.
│   ├── Uniswap/
│   │   ├── swap.js           # Interactive swap script for Uniswap operations.
│   │   ├── ABI.js            # Exports ABI definitions for Uniswap contracts.
│   │   └── scripts/
│   │       └── apis.js       # API calls for Uniswap-related operations.
│   ├── KuruSwap/
│   │   ├── ABI.js            # Exports ABI definitions for KuruSwap contracts.
│   │   ├── swap.js           # Script to perform token swaps on the KuruSwap platform.
│   │   ├── dev.js            # Script for token launch and initial purchases on KuruSwap.
│   │   ├── launch.js         # Script for token launch only on KuruSwap.
│   │   ├── random.js         # Random swap script for KuruSwap (performs random swaps automatically).
│   │   └── scripts/
│   │       └── apis.js       # API calls to fetch parameter data for KuruSwap swap operations.
│   ├── NostraFinance/
│   │   ├── ABI.js            # Exports ABI definitions for NostraFinance contracts.
│   │   └── index.js          # Main script for the NostraFinance module.
│   ├── Nad.Fun/
│   │   ├── ABI.js            # Contains and exports the ABI definitions for Nad.Fun contracts.
│   │   ├── deploy.js         # Deployment script for Nad.Fun contracts on testnet.
│   │   ├── basicSwap.js      # Basic swap script prompting for all required swap details.
│   │   ├── dev.js            # Script for token deployment and insider buying transactions.
│   │   ├── snipe.js          # Script that continuously monitors for recently launched tokens to auto buy/sell.
│   │   ├── liquidate.js      # Similar to swap.js but prompts for contracts of tokens bought to sell for MON.
│   │   ├── swap.js           # Script to manage swap operations (buying/selling) of tokens.
│   │   ├── tokens.json       # Stores records of purchased tokens (contract address, wallet IDs, timestamp, purchase price).
│   │   ├── help.txt          # Documentation with descriptions and instructions for Nad.Fun module files.
│   │   └── scripts/
│   │       └── apis.js       # Contains API functions (getTokenURI, getMetadataTokenURI, getRecentLaunchedTokens, getTokenPrice).
│   ├── Nad.Domains/
│   │   ├── ABI.js            # Contains and exports the ABI definitions for Nad.Domains contracts.
│   │   ├── index.js          # Main script for the Nad.Domains module; interactive menu for domain registration and management.
│   │   ├── faucet.js         # (Optional) Script for domain faucet operations.
│   │   └── scripts/
│   │       └── apis.js       # Contains API functions (e.g., getSignatureToBuy) for domain registration.
│   ├── OctoSwap/
│   │   ├── ABI.js            # Exports ABI definitions for OctoSwap's router, liquidity, random swap, and swap contracts.
│   │   ├── liquidity.js      # To be implemented – Script for managing liquidity operations on OctoSwap.
│   │   ├── random.js         # Random swap script for OctoSwap (performs random swaps automatically under custom rules).
│   │   ├── liquidate.js      # Dedicated script to swap all available tokens back to MON.
│   │   └── swap.js           # Interactive swap script for OctoSwap with token approvals, dynamic gas settings, and support for MON/WMON wrapping/unwrapping.
│   ├── Magma/
│   │   ├── index.js          # Main script for the Magma module; handles core functionalities for Magma-related actions.
│   │   └── ABI.js            # Exports the ABI definitions for Magma contracts; used to interact with Magma-specific smart contracts.
│   ├── DirolSwap/
│   │   ├── ABI.js            # Exports the ABI definitions for DirolSwap contracts (to be implemented).
│   │   ├── liquidity.js      # Script for managing liquidity operations on DirolSwap (to be implemented).
│   │   ├── swap.js           # Interactive swap script for DirolSwap operations (to be implemented).
│   │   └── scripts/
│   │       └── apis.js       # API functions for DirolSwap operations (to be implemented).
│   └── OrochiNetwork/        # New Module: Orochi Network
│       ├── index.js          # Main script (check account points, enable nodes via proxies).
│       ├── tokens.txt        # Bearer tokens, one per line (aligned 1:1 with proxies.txt).
│       ├── instructions.txt  # Guide explaining how to obtain Orochi bearer tokens.
│       └── scripts/
│           └── apis.js       # GraphQL helpers for getUserInfo & enableNode (proxy-aware).
├── faucets/
│   ├── official_faucet/
│   │   ├── claim.js          # Script to claim tokens from the official faucet.
│   │   ├── solve_captcha.py  # Python script to solve reCAPTCHA using 2Captcha.
│   │   └── scripts/
│   │       └── apis.js       # API calls for the official faucet (to be implemented).
│   ├── morkie_faucet/
│   │   ├── claim.js          # Script to claim tokens from the Morkie faucet (verifies NFT ownership).
│   │   └── scripts/
│   │       └── apis.js       # API calls for the Morkie faucet.
│   ├── owlto_faucet          # To be implemented – Owlto faucet script.
│   └── faucet.trade/
│       ├── add_data.js       # Interactive script to add credentials for the trade faucet.
│       ├── captcha.js        # Script to handle captcha challenges for faucet trades.
│       ├── credentials.json  # Credentials for the trade faucet (API keys, secrets, etc.).
│       ├── index.js          # Main script for the trade faucet module (menu for wallet options, adding credentials, etc.).
│       └── scripts/
│           └── apis.js       # API calls for the trade faucet (to be implemented).
├── strategies/
│   ├── for_faucet/
│   │   ├── help.txt          # Help file with instructions on how to use the faucet.
│   │   ├── deploy.js         # Script to compile and deploy the faucet contract on the testnet.
│   │   ├── faucetABI.json    # JSON containing ABI and deployed address for the Faucet contract.
│   │   ├── faucet.sol        # Solidity contract implementing faucet functionalities (deposit, withdrawal, whitelist, claims).
│   │   └── transfers.js      # Script for interacting with the Faucet contract (fund transfers, claims, whitelist ops).
│   └── nfts/
│       └── transfers.js      # Script for managing NFT transfers (minting, burning, transferring on testnet).
├── utils/
│   ├── balanceChecker.js     # Script to check wallet balances.
│   ├── chain.js              # Network configuration (RPC_URL, CHAIN_ID, SYMBOL, TX_EXPLORER, etc.).
│   ├── txChecker.js          # Script to monitor transaction statuses.
│   ├── wallet_aggregator.js  # Script to aggregate wallet data from various sources.
│   ├── wallet_generator.js   # Script to generate new wallets.
│   └── wallets.json          # JSON file containing wallet data (id, address, privateKey).
├── index.js                  # Main entry point with interactive menu and child-process execution.
├── package.json              # npm dependencies and project scripts.
├── proxies.txt               # Proxy list (one per line, socks5://login:pass@ip:port) matched 1:1 with tokens.txt.
└── .vscode/
    └── launch.json           # VSCode launch configuration for debugging.

```

``` bash

## Instructions

1. git clone https://github.com/Naeaerc20/MonadTestnet
2. cd MonadTestnet
3. npm install
4. Use some of the following prompts to interact with this CLI

- npm start - (runs index.js main code)
- npm run add - (run node utils/wallet_aggregator.js - allowing you to add your existing addresses)
- npm run generate - (run utils/wallet_generator.js - allowing you to generate new addresses to participate in Monad Testnet)

Good Luck! :)


## Requieriments

1. Set your 2CAPTCHA API on "solve_captcha.py" using "nano faucets/official_faucet/solve_captcha.py" - (currently official faucet no working at all)
2. Set your ACCESS_TOKEN on "captcha.js" using "nano faucets/faucet.trade/captcha.js" from BestCaptchaSolver Website - Here: https://bestcaptchasolver.com/account - Load some funds on your account = Done Example: https://prnt.sc/QgaLKInhRC3t

## Notes

1. Added liquidate.js on BeanSwap & Nad.Fun that check all the wallets and check any existing Token Balance if any amount is found it swaps back to MON + Added YAKI + CHOG on BeanSwap
(KuruSwap has a few issues when selling tokens so to avoid failed tx's use BeanSwap) - Improved random & basic swaps & bugs solved
