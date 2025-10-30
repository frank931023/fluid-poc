<template>
  <div class="container">
    <h2>Fluid PoC — Scan & Pay (demo)</h2>

    <section class="card">
      <div v-if="!connected">
        <button @click="connectWallet">Connect Wallet</button>
      </div>
      <div v-else class="row">
        <div><strong>Address:</strong> {{ address }}</div>
        <div><strong>Network:</strong> {{ chainId }}</div>
        <button @click="disconnectWallet">Disconnect</button>
      </div>
    </section>

    <div class="grid">
      <section class="card">
        <h3>Payment</h3>
        <label>Merchant address
          <input v-model="merchant" />
        </label>
        <label>Amount (USDC)
          <input v-model.number="amount" type="number" min="0" />
        </label>
        <label>RWA Token ID
          <input v-model.number="rwaTokenId" type="number" min="0" />
        </label>
        <div style="margin-top:8px">
          <button @click="pay">Borrow &amp; Pay</button>
        </div>
      </section>

      <section class="card">
        <h3>Config / Contracts</h3>
        <div><strong>Network:</strong> {{ CONFIG.network }}</div>
        <div class="contracts">
          <div><strong>FakeUSDC:</strong> {{ CONFIG.addresses.contracts.FakeUSDC }}</div>
          <div><strong>RwaNft:</strong> {{ CONFIG.addresses.contracts.RwaNft }}</div>
          <div><strong>LendingPool:</strong> {{ CONFIG.addresses.contracts.LendingPool }}</div>
        </div>
      </section>
    </div>

    <section class="card">
      <h3>Logs</h3>
      <div class="logs">
        <div v-for="(l, idx) in logs" :key="idx" class="log">{{ l }}</div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import useWallet from './composables/useWallet';
import CONFIG from './constants';
import { ethers } from 'ethers';

const { provider, signer, address, chainId, connected, connect, disconnect, getSigner } = useWallet();

const merchant = ref('');
const amount = ref(1);
const rwaTokenId = ref(1);
const logs = ref([]);

function pushLog(msg) {
  logs.value.unshift(new Date().toISOString() + '  ' + msg);
}

async function connectWallet() {
  try {
    await connect();
    pushLog('Wallet connected: ' + (address.value || 'unknown'));
  } catch (e) {
    pushLog('connect error: ' + (e && e.message ? e.message : String(e)));
  }
}

function disconnectWallet() {
  disconnect();
  pushLog('Wallet disconnected');
}

const canPay = computed(() => {
  return !!(connected?.value && merchant?.value && Number(amount?.value) > 0 && Number.isInteger(Number(rwaTokenId?.value)));
});

async function pay() {
  try {
  // Resolve signer via composable helper to avoid stale refs
  // const signerInstance = getSigner ? getSigner() : ((signer && signer.value) ? signer.value : (provider && provider.value ? provider.value.getSigner() : null));
  const signerInstance = getSigner();
    if (!signerInstance) {
      pushLog('No signer available — please connect your wallet');
      return;
    }

    // validate inputs and log errors to logs (do not silently return without a message)
    const isAddress = ethers.utils && ethers.utils.isAddress ? ethers.utils.isAddress : (addr) => false;
    if (!merchant.value || !isAddress(merchant.value)) {
      pushLog('Invalid merchant address: ' + String(merchant.value));
      return;
    }

    if (!amount.value || Number(amount.value) <= 0) {
      pushLog('Invalid amount: ' + String(amount.value));
      return;
    }

    if (!Number.isInteger(Number(rwaTokenId.value)) || Number(rwaTokenId.value) < 0) {
      pushLog('Invalid RWA token id: ' + String(rwaTokenId.value));
      return;
    }

    const lendingAddress = CONFIG.addresses.contracts.LendingPool;
    const abi = CONFIG.abis.LendingPool;

    const contract = new ethers.Contract(lendingAddress, abi, signerInstance);

    const parseUnits = ethers.parseUnits ?? (ethers.utils && ethers.utils.parseUnits);
    const totalAmountToPay = parseUnits ? parseUnits(amount.value.toString(), 18) : amount.value;

    pushLog(`Calling borrowAndPay(merchant=${merchant.value}, amount=${amount.value}, tokenId=${rwaTokenId.value})`);

    const tx = await contract.borrowAndPay(merchant.value, totalAmountToPay, parseInt(rwaTokenId.value));
    pushLog('Transaction sent: ' + (tx && tx.hash ? tx.hash : JSON.stringify(tx)));
    if (tx && tx.wait) {
      const receipt = await tx.wait();
      pushLog('Transaction confirmed: ' + JSON.stringify(receipt, null, 2));
    } else {
      pushLog('No tx.wait() available; transaction object: ' + JSON.stringify(tx));
    }
  } catch (e) {
    pushLog('pay error: ' + (e && e.message ? e.message : String(e)));
  }
}
</script>

<style scoped>
.container { max-width:800px; margin:24px auto; font-family: Arial, Helvetica, sans-serif }
.card { margin-bottom:16px; padding:12px; border:1px solid #eee; border-radius:8px }
.row { display:flex; gap:12px; align-items:center }
.grid { display:flex; gap:16px }
input { width:100%; padding:6px 8px; border-radius:6px; border:1px solid #ddd; box-sizing:border-box }
button { padding:8px 12px; border-radius:6px; cursor:pointer }
.logs { max-height:200px; overflow:auto }
.log { font-family: monospace; white-space: pre-wrap; margin-bottom:6px }
</style>
