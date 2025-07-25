// FILE: src/pages/AziendaPage.tsx
// DESCRIZIONE: Versione aggiornata che verifica lo stato dell'utente tramite
// un endpoint API che interroga Firebase, invece di chiamare direttamente lo smart contract.

import React, { useState, useEffect } from "react";
import { ConnectButton, useActiveAccount } from "thirdweb/react";
import { createThirdwebClient } from "thirdweb";
import { polygon } from "thirdweb/chains";
import { inAppWallet } from "thirdweb/wallets";
import "../App.css";

// Importa i componenti esterni
import RegistrationForm from "../components/RegistrationForm";

// --- Stili (nessuna modifica) ---
const AziendaPageStyles = () => (
  <style>{`
      .app-container-full { padding: 0 2rem; }
      .main-header-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; flex-wrap: wrap; }
      .header-title { font-size: 1.75rem; font-weight: bold; }
      .login-container, .centered-container { display: flex; flex-direction: column; justify-content: center; align-items: center; min-height: 80vh; text-align: center; }
      .dashboard-header-card { background-color: #f8f9fa; color: #212529; padding: 1.5rem; border-radius: 0.75rem; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); margin-bottom: 2rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; }
      .dashboard-title { font-size: 1.5rem; font-weight: 600; }
      .web3-button { background-color: #3b82f6; color: white; padding: 0.75rem 1.5rem; border: none; border-radius: 0.5rem; font-weight: 500; cursor: pointer; transition: background-color 0.2s; font-size: 1rem; }
      .web3-button:hover { background-color: #2563eb; }
      .batches-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1.5rem; }
      .batch-card { background-color: #ffffff; border-radius: 0.75rem; padding: 1.5rem; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05); border: 1px solid #e2e8f0; }
      .batch-card h3 { font-size: 1.25rem; font-weight: 600; color: #1a202c; margin-top: 0; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.75rem; margin-bottom: 1rem; word-wrap: break-word; }
      .batch-card p { margin: 0.5rem 0; color: #4a5568; font-size: 0.9rem; word-wrap: break-word; }
      .batch-card strong { color: #2d3748; }
      .batch-card a { color: #3b82f6; text-decoration: none; font-weight: 500; }
      .loading-error-container { text-align: center; padding: 3rem; background-color: #f7fafc; border-radius: 0.75rem; }
      .steps-container { margin-top: 1rem; border-top: 1px solid #eee; padding-top: 1rem; }
      .steps-container h4 { margin-top: 0; margin-bottom: 0.5rem; font-size: 0.9rem; font-weight: 600; }
      .step-item { font-size: 0.8rem; padding-left: 1rem; border-left: 2px solid #ddd; margin-bottom: 0.75rem; }
  `}</style>
);
const truncateText = (text: string, maxLength: number) => {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
};

// Interfacce per i dati
interface Step { stepIndex: string; eventName: string; description: string; date: string; location: string; attachmentsIpfsHash: string; }
interface Batch { batchId: string; name: string; description: string; date: string; location: string; imageIpfsHash: string; isClosed: boolean; transactionHash: string; steps: Step[]; }
interface CompanyData { companyName: string; credits: number; }

const client = createThirdwebClient({ clientId: "023dd6504a82409b2bc7cb971fd35b16" });

// Componente per la Dashboard
const Dashboard: React.FC<{ companyData: CompanyData }> = ({ companyData }) => {
  const account = useActiveAccount();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [isLoadingBatches, setIsLoadingBatches] = useState(true);
  const [errorBatches, setErrorBatches] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (!account) return;
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
        const readyBatches: Batch[] = data.events || [];
        setBatches(readyBatches.sort((a, b) => parseInt(b.batchId) - parseInt(a.batchId)));
      } catch (error: any) {
        setErrorBatches(error.message || "Errore sconosciuto.");
      } finally {
        setIsLoadingBatches(false);
      }
    };
    loadBatches();
  }, [account]);

  return (
    <>
      <div className="dashboard-header-card">
        <div>
            <h2 className="dashboard-title">{companyData.companyName}</h2>
            <p>Crediti Rimanenti: <strong>{companyData.credits}</strong></p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="web3-button">+ Inizializza Nuovo Lotto</button>
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
                <p><strong>Descrizione:</strong> {truncateText(batch.description, 100)}</p>
                <p><strong>Data:</strong> {batch.date} | <strong>Luogo:</strong> {batch.location}</p>
                <p><strong>Stato:</strong> {batch.isClosed ? 'Chiuso' : 'Aperto'}</p>
                <p><strong>Tx Hash:</strong> <a href={`https://polygonscan.com/tx/${batch.transactionHash}`} target="_blank" rel="noopener noreferrer">{truncateText(batch.transactionHash, 15)}</a></p>
                {batch.steps && batch.steps.length > 0 && (
                  <div className="steps-container">
                    <h4>Steps:</h4>
                    {batch.steps.map(step => (
                      <div key={step.stepIndex} className="step-item">
                         <p><strong>{step.eventName}</strong> (Step #{step.stepIndex})</p>
                         <p>Desc: {truncateText(step.description, 50)}</p>
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
      {/* Qui andrà la logica del modale per creare un nuovo lotto */}
    </>
  );
};

// Componente Principale "Controllore"
const AziendaPage: React.FC = () => {
  const account = useActiveAccount();
  
  const [companyStatus, setCompanyStatus] = useState<{
    isLoading: boolean;
    isActive: boolean;
    data: CompanyData | null;
    error: string | null;
  }>({
    isLoading: true,
    isActive: false,
    data: null,
    error: null,
  });

  useEffect(() => {
    if (!account) {
      setCompanyStatus({ isLoading: false, isActive: false, data: null, error: null });
      return;
    }

    const checkCompanyStatus = async () => {
      setCompanyStatus(prev => ({ ...prev, isLoading: true }));
      try {
        const response = await fetch(`/api/get-company-status?walletAddress=${account.address}`);
        if (!response.ok) {
          throw new Error('Errore di rete nella verifica dello stato.');
        }
        const data = await response.json();
        setCompanyStatus({
          isLoading: false,
          isActive: data.isActive,
          data: data.isActive ? { companyName: data.companyName, credits: data.credits } : null,
          error: null,
        });
      } catch (err: any) {
        setCompanyStatus({
          isLoading: false,
          isActive: false,
          data: null,
          error: err.message,
        });
      }
    };

    checkCompanyStatus();
  }, [account]);

  const renderContent = () => {
    if (companyStatus.isLoading) {
      return <div className="centered-container"><p>Verifica stato account in corso...</p></div>;
    }

    if (companyStatus.error) {
      return <div className="centered-container"><p style={{ color: "red" }}>{companyStatus.error}</p></div>;
    }

    if (companyStatus.isActive && companyStatus.data) {
      return <Dashboard companyData={companyStatus.data} />;
    }
    
    if (account) {
      return <RegistrationForm walletAddress={account.address} />;
    }

    return <div className="centered-container"><p>Connetti il wallet per continuare.</p></div>;
  };

  if (!account) {
    return (
      <div className="login-container">
        <AziendaPageStyles />
        <div style={{ textAlign: "center" }}>
          <h1>Benvenuto</h1>
          <p>Connetti il tuo wallet per accedere.</p>
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
          {renderContent()}
        </main>
      </div>
    </>
  );
};

export default AziendaPage;
