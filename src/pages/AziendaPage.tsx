import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  ConnectButton,
  useActiveAccount,
  useReadContract,
  useSendTransaction,
} from "thirdweb/react";
import {
  createThirdwebClient,
  getContract,
  prepareContractCall,
} from "thirdweb";
import { polygon } from "thirdweb/chains";
import { inAppWallet } from "thirdweb/wallets";
import { supplyChainABI as abi } from "../abi/contractABI";
import "../App.css";
import TransactionStatusModal from "../components/TransactionStatusModal";


const CLIENT_ID = "34087f86e3a1c30b5fbf54150c052b45";
const CONTRACT_ADDRESS = "0x2bd72307a73cc7be3f275a81c8edbe775bb08f3e";

const client = createThirdwebClient({ clientId: CLIENT_ID });
const contract = getContract({ client, chain: polygon, address: CONTRACT_ADDRESS });

export default function AziendaPage() {
  const account = useActiveAccount();
  const [rawEvents, setRawEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!account?.address) return;

    const fetchRawEvents = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/thirdweb-insight?address=${account.address}`);
        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`Errore dal server proxy: ${response.status} - ${errText}`);
        }
        const data = await response.json();
        console.log("✅ DATI GREZZI RICEVUTI CON SUCCESSO:", data);
        setRawEvents(data);
      } catch (err: any) {
        console.error("❌ ERRORE FINALE:", err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRawEvents();
  }, [account]);

  if (!account) {
    return (
      <div className="login-container">
        <h1>Connettiti per continuare</h1>
        <ConnectButton client={client} chain={polygon} accountAbstraction={{ chain: polygon, sponsorGas: true }} wallets={[inAppWallet()]} />
      </div>
    );
  }

  return (
    <div className="app-container-full">
      <header className="main-header-bar">
        <h1 className="header-title">Dati Grezzi da Insight</h1>
        <ConnectButton client={client} chain={polygon} />
      </header>
      <main className="main-content-full">
        <h2>Test di Connessione all'API di Insight</h2>
        {isLoading && <p>Caricamento dati...</p>}
        {error && <p style={{ color: 'red' }}><strong>Errore:</strong> {error}</p>}
        {!isLoading && !error && (
          <div>
            <h3>Chiamata API completata con successo!</h3>
            <p>Sono stati trovati <strong>{rawEvents.length}</strong> eventi grezzi.</p>
            <p>Apri la console del browser (F12) per vedere i dati ricevuti.</p>
            <pre style={{ backgroundColor: '#222', padding: '1rem', borderRadius: '8px', color: '#eee', maxHeight: '500px', overflow: 'auto' }}>
              {JSON.stringify(rawEvents, null, 2)}
            </pre>
          </div>
        )}
      </main>
    </div>
  );
}