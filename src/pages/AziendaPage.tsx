// FILE: src/pages/AziendaPage.tsx
// VERSIONE AGGIORNATA: Mostra una dashboard per gli utenti attivi.

import React, { useState, useEffect } from "react";
import {
  ConnectButton,
  useActiveAccount,
  useReadContract,
} from "thirdweb/react";
import {
  createThirdwebClient,
  getContract,
} from "thirdweb";
import { polygon } from "thirdweb/chains";
import { inAppWallet } from "thirdweb/wallets";
import { supplyChainABI as abi } from "../abi/contractABI";
import "../App.css";

// --- Stili CSS ---
const AziendaPageStyles = () => (
  <style>{` 
     .app-container-full { padding: 0 2rem; } 
     .main-header-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; flex-wrap: wrap; } 
     .header-title { font-size: 1.75rem; font-weight: bold; }
     .centered-container { display: flex; flex-direction: column; justify-content: center; align-items: center; min-height: 70vh; text-align: center; }
     .login-container { display: flex; justify-content: center; align-items: center; height: 100vh; }
     
     /* Stili per la nuova Dashboard */
     .contributor-dashboard {
        background-color: #212529;
        border: 1px solid #495057;
        border-radius: 12px;
        padding: 2rem;
        width: 100%;
        max-width: 900px;
        text-align: left;
     }
     .dashboard-info h2 {
        margin-top: 0;
        margin-bottom: 1rem;
        font-size: 2rem;
        font-weight: 600;
     }
     .dashboard-info p {
        margin: 0.5rem 0;
        font-size: 1.1rem;
        color: #adb5bd;
     }
     .dashboard-info p strong {
        color: #f8f9fa;
        margin-left: 0.5rem;
     }
     .status-active {
        color: #28a745;
        font-weight: bold;
     }
     
     @media (max-width: 768px) { 
       .app-container-full { padding: 0 1rem; } 
       .main-header-bar { flex-direction: column; align-items: flex-start; gap: 1rem; } 
       .contributor-dashboard { padding: 1.5rem; }
       .dashboard-info h2 { font-size: 1.5rem; }
     } 
   `}</style>
);

// --- CONFIGURAZIONE GLOBALE ---
const CLIENT_ID = "023dd6504a82409b2bc7cb971fd35b16";
const CONTRACT_ADDRESS = "0x0c5e6204e80e6fb3c0c7098c4fa84b221035b1d";

const client = createThirdwebClient({ clientId: CLIENT_ID });

const contract = getContract({
  client,
  chain: polygon,
  address: CONTRACT_ADDRESS,
  abi,
});

// --- COMPONENTE FORM DI REGISTRAZIONE (Invariato) ---
const RegistrationForm = ({ walletAddress }: { walletAddress: string }) => {
    // ... (codice del form di registrazione invariato)
    return <div className="card" style={{marginTop: '2rem', maxWidth: '700px', margin: '2rem auto', textAlign: 'left'}}>...</div>;
};

// --- NUOVO COMPONENTE: DASHBOARD PER UTENTE ATTIVO ---
const ContributorDashboard = ({ data }: { data: readonly [string, bigint, boolean] }) => {
    const [companyName, credits, isActive] = data;

    return (
        <div className="contributor-dashboard">
            <div className="dashboard-info">
                <h2>{companyName}</h2>
                <p>Crediti Rimanenti: <strong>{credits.toString()}</strong></p>
                <p>Stato: <strong className="status-active">ATTIVO ✅</strong></p>
            </div>
            {/* Qui in futuro potresti aggiungere altri elementi, come il pulsante "Nuova Iscrizione" */}
        </div>
    );
};


// --- COMPONENTE PRINCIPALE ---
export default function AziendaPage() {
  const account = useActiveAccount();
  const { data: contributorData, isLoading: isStatusLoading, isError } = useReadContract({
    contract,
    method: "getContributorInfo",
    params: account ? [account.address] : undefined,
    queryOptions: { enabled: !!account },
  });

  // --- LOGICA DI RENDER ---
  if (!account) {
    return (
      <div className="login-container">
        <AziendaPageStyles />
        <ConnectButton 
          client={client} 
          chain={polygon} 
          accountAbstraction={{ chain: polygon, sponsorGas: true }} 
          wallets={[inAppWallet()]} 
          connectButton={{ label: "Connettiti / Log In", style: { fontSize: "1.2rem", padding: "1rem 2rem" } }} 
        />
      </div>
    );
  }

  const renderContent = () => {
    if (isStatusLoading) {
      return <p>Verifica stato account...</p>;
    }

    if (isError) {
      return <p style={{ color: "red" }}>Errore nel recuperare i dati dell'account. Riprova.</p>;
    }

    if (contributorData) {
      const isContributorActive = contributorData[2];
      
      if (isContributorActive) {
        // Utente ATTIVO -> Mostra la nuova dashboard
        return <ContributorDashboard data={contributorData} />;
      } else {
        // Utente NON ATTIVO -> Mostra il form di registrazione
        return <RegistrationForm walletAddress={account.address} />;
      }
    }

    return <p>Impossibile determinare lo stato dell'account.</p>;
  };

  return (
    <div className="app-container-full">
      <AziendaPageStyles />
      <header className="main-header-bar">
        <div className="header-title">EasyChain - Area Riservata</div>
        <div className="wallet-button-container">
          <ConnectButton 
            client={client} 
            chain={polygon} 
            accountAbstraction={{ chain: polygon, sponsorGas: true }} 
            detailsModal={{ hideSend: true, hideReceive: true, hideBuy: true, hideTransactionHistory: true }} 
          />
        </div>
      </header>
      <main className="main-content-full">
        <div className="centered-container">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}
