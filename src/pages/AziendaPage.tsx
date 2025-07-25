// FILE: src/pages/AziendaPage.tsx
// DESCRIZIONE: Versione rifattorizzata che importa i componenti esterni
// e gestisce la logica di visualizzazione condizionale per l'utente.

import React, { useState } from "react";
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

// --- MODIFICA 1: Importa i componenti esterni ---
import RegistrationForm from "../components/RegistrationForm";
import ContributorDashboard from "../components/ContributorDashboard";
import TransactionStatusModal from "../components/TransactionStatusModal";

// --- Stili CSS (Mantenuti come nel file originale per coerenza) ---
const AziendaPageStyles = () => (
  <style>{` 
     .app-container-full { padding: 0 2rem; } 
     .main-header-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; flex-wrap: wrap; } 
     .header-title { font-size: 1.75rem; font-weight: bold; }
     .centered-container { display: flex; flex-direction: column; justify-content: center; align-items: center; min-height: 70vh; text-align: center; }
     .login-container { display: flex; justify-content: center; align-items: center; height: 100vh; }
     
     /* Stili per la Dashboard (Desktop) */
     .contributor-dashboard { background-color: #212529; border: 1px solid #495057; border-radius: 12px; padding: 2rem; width: 100%; max-width: 900px; text-align: left; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1.5rem; margin: 0 auto; }
     .dashboard-info h2 { margin-top: 0; margin-bottom: 1rem; font-size: 2rem; font-weight: 600; }
     .dashboard-info p { margin: 0.5rem 0; font-size: 1.1rem; color: #adb5bd; }
     .dashboard-info p strong { color: #f8f9fa; margin-left: 0.5rem; }
     .status-active { color: #28a745; font-weight: bold; }
     .recap-summary { text-align: left; padding: 15px; background-color: #2a2a2a; border: 1px solid #444; border-radius: 8px; margin-bottom: 20px;} 
     .recap-summary p { margin: 8px 0; word-break: break-word; } 
     .recap-summary p strong { color: #f8f9fa; } 
   `}</style>
);

// --- CONFIGURAZIONE GLOBALE ---
const CLIENT_ID = "023dd6504a82409b2bc7cb971fd35b16";
const CONTRACT_ADDRESS = "0x0c5e6204e80e6fb3c0c7098c4fa84b2210358d0b";

const client = createThirdwebClient({ clientId: CLIENT_ID });

const contract = getContract({
  client,
  chain: polygon,
  address: CONTRACT_ADDRESS,
  abi,
});

// Funzioni helper
const getInitialFormData = () => ({ name: "", description: "", date: "", location: "" });
const truncateText = (text: string, maxLength: number) => { if (!text) return text; return text.length > maxLength ? text.substring(0, maxLength) + "..." : text; };

export default function AziendaPage() {
  const account = useActiveAccount();
  const { mutate: sendTransaction, isPending } = useSendTransaction();
  
  // Hook per leggere lo stato del contributor dal contratto
  const { data: contributorData, isLoading: isStatusLoading, isError, refetch: refetchContributorInfo } = useReadContract({
    contract,
    method: "getContributorInfo",
    params: account ? [account.address] : undefined,
    queryOptions: { enabled: !!account },
  });

  // Stati per la gestione del modale di creazione iscrizione
  const [modal, setModal] = useState<"init" | null>(null);
  // ... (altri stati e funzioni per il modale rimangono qui)

  const openModal = () => setModal("init");
  const handleCloseModal = () => setModal(null);

  // --- MODIFICA 2: Logica di rendering migliorata ---
  const renderContent = () => {
    if (isStatusLoading) {
      return <div className="centered-container"><p>Verifica stato account in corso...</p></div>;
    }

    if (isError) {
      return <div className="centered-container"><p style={{ color: "red" }}>Errore nel recuperare i dati dal contratto. Riprova.</p></div>;
    }

    // Se abbiamo i dati e il terzo elemento (isContributorActive) è true...
    if (contributorData && contributorData[2]) {
      // ...mostra la dashboard.
      return <ContributorDashboard data={contributorData} onNewInscriptionClick={openModal} />;
    }
    
    // In tutti gli altri casi (utente non trovato, utente non attivo), mostra il form di registrazione.
    // Ci assicuriamo che l'account esista prima di renderizzare.
    if (account) {
      return <RegistrationForm walletAddress={account.address} />;
    }

    // Questo caso non dovrebbe verificarsi se l'utente è loggato, ma è una sicurezza.
    return <div className="centered-container"><p>Impossibile determinare lo stato dell'account.</p></div>;
  };

  // Se l'utente non è connesso, mostra il pulsante di connessione
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
        {renderContent()}
      </main>

      {/* La logica del modale per creare nuove iscrizioni rimane qui */}
      {modal === "init" && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          {/* ... Il codice del tuo modale va qui ... */}
        </div>
      )}
    </div>
  );
}
