const fs = require('fs');
const path = require('path');
const { ethers } = require('ethers');
const chain = require(path.join(__dirname, 'chain.js'));

// Construir la ruta completa al archivo wallets.json
const walletsPath = path.join(__dirname, 'wallets.json');
let wallets;
try {
  wallets = JSON.parse(fs.readFileSync(walletsPath, 'utf8'));
} catch (error) {
  console.error("Error al leer wallets.json:", error);
  process.exit(1);
}

// Configurar el proveedor usando los datos de chain.js
const provider = new ethers.providers.JsonRpcProvider(chain.RPC_URL, chain.CHAIN_ID);

async function checkBalances() {
  for (const wallet of wallets) {
    try {
      // Obtener el balance en wei
      const balanceWei = await provider.getBalance(wallet.address);
      // Convertir de wei a la unidad estándar
      const balance = ethers.utils.formatEther(balanceWei);
      // Imprimir en el formato requerido
      console.log(`💰 Wallet - ID - [${wallet.id}] - [${wallet.address}] Has currently [${balance}] ${chain.SYMBOL}`);
    } catch (error) {
      console.error(`Error al obtener el balance de la wallet ${wallet.address}:`, error);
    }
  }
}

checkBalances();
