import { ref, onMounted } from 'vue';
import { ethers } from 'ethers';

export function useWallet() {
  // provider and signer are plain variables (non-reactive)
  let provider = null;
  let signer = null;

  // reactive pieces for the UI
  const address = ref(null);
  const chainId = ref(null);
  const connected = ref(false);

  // Connect wallet (ethers v5 Web3Provider)
  async function connect() {
    if (typeof window === 'undefined' || !window.ethereum) {
      throw new Error('No injected wallet found (window.ethereum)');
    }

    provider = new ethers.providers.Web3Provider(window.ethereum);

    // Request accounts (use provider.request if available)
    if (window.ethereum.request) {
      await window.ethereum.request({ method: 'eth_requestAccounts' });
    } else {
      await provider.send('eth_requestAccounts', []);
    }

    signer = provider.getSigner();

    // Try to get address from signer, otherwise list accounts as fallback
    try {
      address.value = await signer.getAddress();
    } catch (err) {
      const accounts = await provider.listAccounts();
      address.value = accounts && accounts.length ? accounts[0] : null;
    }

    connected.value = !!address.value;

    try {
      const network = await provider.getNetwork();
      chainId.value = network && network.chainId ? network.chainId : null;
    } catch (e) {
      chainId.value = null;
    }

    // listeners
    if (window.ethereum && window.ethereum.on) {
      window.ethereum.on('accountsChanged', async (accounts) => {
        if (accounts && accounts.length) {
          address.value = accounts[0];
          signer = provider.getSigner();
          connected.value = true;
        } else {
          address.value = null;
          signer = null;
          connected.value = false;
        }
      });

      window.ethereum.on('chainChanged', (chainHex) => {
        try {
          chainId.value = parseInt(chainHex, 16);
        } catch (e) {
          chainId.value = null;
        }
      });
    }

    return { provider, signer, address: address.value };
  }

  function disconnect() {
    provider = null;
    signer = null;
    address.value = null;
    chainId.value = null;
    connected.value = false;
  }

  onMounted(async () => {
    if (typeof window !== 'undefined' && window.ethereum && window.ethereum.selectedAddress) {
      try {
        await connect();
      } catch (e) {
        // ignore
      }
    }
  });

  // helper to get a signer on-demand (avoids stale signer refs)
  function getSigner() {
    if (signer) return signer;
    if (provider) return provider.getSigner();
    return null;
  }

  return {
    provider,
    signer,
    address,
    chainId,
    connected,
    connect,
    disconnect,
    getSigner,
  };
}

export default useWallet;
