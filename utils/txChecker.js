// utils/txChecker.js

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

async function checkTxCounts() {
  for (const wallet of wallets) {
    try {
      // Obtener la cantidad de transacciones realizadas por la wallet
      const txCount = await provider.getTransactionCount(wallet.address);
      // Imprimir en el formato requerido, incluyendo un icono y los corchetes
      console.log(`🔢 Wallet - [${wallet.address}] Has total [${txCount}] transactions`);
    } catch (error) {
      console.error(`Error al obtener el número de transacciones de la wallet ${wallet.address}:`, error);
    }
  }
}

checkTxCounts();
