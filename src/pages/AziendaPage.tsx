// FILE: src/pages/AziendaPage.tsx
// DESCRIZIONE: Versione finale che visualizza la struttura dati gerarchica (lotti con step)
// fornita dalla nuova API.

import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ConnectButton, useActiveAccount, useSendTransaction } from "thirdweb/react";
import { createThirdwebClient, getContract, prepareContractCall } from "thirdweb";
import { polygon } from "thirdweb/chains";
import { inAppWallet } from "thirdweb/wallets";
import { supplyChainABI as abi } from "../abi/contractABI";
import "../App.css";
import TransactionStatusModal from "../components/TransactionStatusModal";

// --- Stili (nessuna modifica) ---
const AziendaPageStyles = () => (
  <style>{`
      .app-container-full { padding: 0 2rem; }
      .main-header-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; flex-wrap: wrap; }
      .header-title { font-size: 1.75rem; font-weight: bold; }
      .login-container { display: flex; justify-content: center; align-items: center; height: 100vh; }
      .dashboard-header-card { background-color: #ffffff; padding: 1.5rem; border-radius: 0.75rem; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); margin-bottom: 2rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; }
      .dashboard-title { font-size: 1.5rem; font-weight: 600; color: #1a202c; }
      .web3-button { background-color: #3b82f6; color: white; padding: 0.75rem 1.5rem; border: none; border-radius: 0.5rem; font-weight: 500; cursor: pointer; transition: background-color 0.2s; font-size: 1rem; }
      .web3-button:hover { background-color: #2563eb; }
      .web3-button.secondary { background-color: #e2e8f0; color: #2d3748; }
      .web3-button.secondary:hover { background-color: #cbd5e1; }
      .web3-button:disabled { background-color: #94a3b8; cursor: not-allowed; }
      .batches-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1.5rem; }
      .batch-card { background-color: #ffffff; border-radius: 0.75rem; padding: 1.5rem; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05); transition: transform 0.2s, box-shadow 0.2s; border: 1px solid #e2e8f0; }
      .batch-card:hover { transform: translateY(-5px); box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08); }
      .batch-card h3 { font-size: 1.25rem; font-weight: 600; color: #1a202c; margin-top: 0; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.75rem; margin-bottom: 1rem; word-wrap: break-word; }
      .batch-card p { margin: 0.5rem 0; color: #4a5568; font-size: 0.9rem; word-wrap: break-word; }
      .batch-card strong { color: #2d3748; }
      .batch-card a { color: #3b82f6; text-decoration: none; font-weight: 500; }
      .batch-card a:hover { text-decoration: underline; }
      .loading-error-container { text-align: center; padding: 3rem; background-color: #f7fafc; border-radius: 0.75rem; }
      .steps-container { margin-top: 1rem; border-top: 1px solid #eee; padding-top: 1rem; }
      .steps-container h4 { margin-top: 0; margin-bottom: 0.5rem; font-size: 0.9rem; font-weight: 600; }
      .step-item { font-size: 0.8rem; padding-left: 1rem; border-left: 2px solid #ddd; margin-bottom: 0.75rem; }
      .step-item p { margin: 0.2rem 0; }
  `}</style>
);
const truncateText = (text: string, maxLength: number) => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
};

// --- MODIFICA 1: Definire le interfacce per la nuova struttura dati ---
interface Step {
  stepIndex: string;
  eventName: string;
  description: string;
  date: string;
  location: string;
  attachmentsIpfsHash: string;
}

interface Batch {
  batchId: string;
  name: string;
  description: string;
  date: string;
  location: string;
  imageIpfsHash: string;
  isClosed: boolean;
  transactionHash: string;
  steps: Step[]; // <-- Gli step sono ora parte del lotto
}

const CONTRACT_ADDRESS = "0x0c5e6204e80e6fb3c0c7098c4fa84b2210358d0b";
const client = createThirdwebClient({ clientId: "023dd6504a82409b2bc7cb971fd35b16" });

const AziendaPage: React.FC = () => {
  const account = useActiveAccount();
  const { mutate: sendTransaction } = useSendTransaction();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [isLoadingBatches, setIsLoadingBatches] = useState(true);
  const [errorBatches, setErrorBatches] = useState<string | null>(null);
  // Stati per il modale (non modificati)
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (!account) {
      setBatches([]);
      setIsLoadingBatches(false);
      return;
    }

    const loadBatches = async () => {
      setIsLoadingBatches(true);
      setErrorBatches(null);
      try {
        const response = await fetch(`/api/get-contract-events?userAddress=${account.address}`);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Errore dal server: ${response.status}`);
        }
        
        const data = await response.json();
        // L'API ora invia i dati già pronti e formattati
        const readyBatches: Batch[] = data.events || [];
        
        setBatches(readyBatches.sort((a, b) => parseInt(b.batchId) - parseInt(a.batchId)));

      } catch (error: any) {
        console.error("Errore nel caricare i batch dall'API:", error);
        setErrorBatches(error.message || "Errore sconosciuto.");
      } finally {
        setIsLoadingBatches(false);
      }
    };

    loadBatches();
  }, [account]);

  // Logica per il modale non modificata
  const handleOpenModal = () => setIsModalOpen(true);
  const handleCloseModal = () => setIsModalOpen(false);

  if (!account) {
    return (
      <div className="login-container">
        <div style={{ textAlign: "center" }}>
          <h1>Benvenuto</h1>
          <p>Connetti il tuo wallet per visualizzare i tuoi lotti.</p>
          <ConnectButton client={client} wallets={[inAppWallet()]} />
        </div>
      </div>
    );
  }

  return (
    <>
      <AziendaPageStyles />
      <div className="app-container-full">
        <header className="main-header-bar">
          <h1 className="header-title">FoodChain</h1>
          <ConnectButton client={client} />
        </header>
        <main>
          <div className="dashboard-header-card">
            <h2 className="dashboard-title">Dashboard Aziendale</h2>
            <button onClick={handleOpenModal} className="web3-button">+ Inizializza Nuovo Lotto</button>
          </div>
          <h3>I Miei Lotti Inizializzati</h3>
          {isLoadingBatches ? (
            <div className="loading-error-container"><p>Caricamento dei tuoi lotti...</p></div>
          ) : errorBatches ? (
            <div className="loading-error-container"><p style={{ color: 'red' }}>{errorBatches}</p></div>
          ) : (
            <div className="batches-grid">
              {batches.length > 0 ? (
                batches.map((batch) => (
                  <div key={batch.batchId} className="batch-card">
                    <h3>Lotto #{batch.batchId} - {batch.name}</h3>
                    <p><strong>Descrizione:</strong> {batch.description}</p>
                    <p><strong>Data:</strong> {batch.date} | <strong>Luogo:</strong> {batch.location}</p>
                    <p><strong>Stato:</strong> {batch.isClosed ? 'Chiuso' : 'Aperto'}</p>
                    <p><strong>Tx Hash:</strong> <a href={`https://polygonscan.com/tx/${batch.transactionHash}`} target="_blank" rel="noopener noreferrer">{truncateText(batch.transactionHash, 15)}</a></p>
                    
                    {/* --- MODIFICA 2: Visualizzare gli step --- */}
                    {batch.steps && batch.steps.length > 0 && (
                      <div className="steps-container">
                        <h4>Steps:</h4>
                        {batch.steps.map(step => (
                          <div key={step.stepIndex} className="step-item">
                             <p><strong>{step.eventName}</strong> (Step #{step.stepIndex})</p>
                             <p>Desc: {step.description}</p>
                             <p>Data: {step.date} | Luogo: {step.location}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <p>Non hai ancora inizializzato nessun lotto con questo account.</p>
              )}
            </div>
          )}
        </main>
      </div>
      {/* Il modale per creare un nuovo lotto rimane qui (logica non mostrata per brevità) */}
    </>
  );
};

export default AziendaPage;
