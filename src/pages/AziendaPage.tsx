// FILE: src/pages/AziendaPage.tsx
// VERSIONE CORRETTA: Risolve l'errore che causava la pagina nera.

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
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 1.5rem;
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
const CONTRACT_ADDRESS = "0x0c5e6204e80e6fb3c0c7098c4fa84b2210358d0b"; // Indirizzo corretto

const client = createThirdwebClient({ clientId: CLIENT_ID });

const contract = getContract({
  client,
  chain: polygon,
  address: CONTRACT_ADDRESS,
  abi,
});

// --- COMPONENTE FORM DI REGISTRAZIONE (CODICE COMPLETO RIPRISTINATO) ---
const RegistrationForm = ({ walletAddress }: { walletAddress: string }) => {
    const [formData, setFormData] = useState({
        companyName: "",
        contactEmail: "",
        sector: "",
        website: "",
        facebook: "",
        instagram: "",
        twitter: "",
        tiktok: "",
    });
    const [status, setStatus] = useState<{ message: string; type: 'error' | 'success' | 'info' } | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.companyName || !formData.contactEmail || !formData.sector) {
            setStatus({ message: "Nome azienda, email e settore sono campi obbligatori.", type: 'error' });
            return;
        }
        setIsLoading(true);
        setStatus({ message: "Invio della richiesta in corso...", type: 'info' });

        try {
            const response = await fetch('/api/send-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...formData, walletAddress }),
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.message || "Si è verificato un errore durante l'invio.");
            }
            
            setStatus({ message: "Richiesta inviata con successo! Verrai ricontattato dopo l'approvazione del tuo account.", type: 'success' });
        } catch (error) {
            setStatus({ message: (error as Error).message, type: 'error' });
        } finally {
            setIsLoading(false);
        }
    };

    if (status?.type === 'success') {
        return (
            <div className="card" style={{marginTop: '2rem', textAlign: 'center'}}>
                <h3>Richiesta Inviata!</h3>
                <p>{status.message}</p>
            </div>
        );
    }

    return (
        <div className="card" style={{marginTop: '2rem', maxWidth: '700px', margin: '2rem auto', textAlign: 'left'}}>
            <h3>Benvenuto su Easy Chain!</h3>
            <p>Il tuo account non è ancora attivo. Compila il form di registrazione per inviare una richiesta di attivazione all'amministratore.</p>
            
            <form onSubmit={handleSubmit} style={{marginTop: '1.5rem'}}>
                <div className="form-group">
                    <label>Nome Azienda *</label>
                    <input type="text" name="companyName" className="form-input" onChange={handleInputChange} required />
                </div>
                <div className="form-group">
                    <label>Email di Contatto *</label>
                    <input type="email" name="contactEmail" className="form-input" onChange={handleInputChange} required />
                </div>
                <div className="form-group">
                    <label>Settore di Attività *</label>
                    <select name="sector" className="form-input" onChange={handleInputChange} required>
                        <option value="">Seleziona un settore...</option>
                        <option value="Agroalimentare">Agroalimentare</option>
                        <option value="Moda e Tessile">Moda e Tessile</option>
                        <option value="Arredamento e Design">Arredamento e Design</option>
                        <option value="Farmaceutico">Farmaceutico</option>
                        <option value="Altro">Altro</option>
                    </select>
                </div>
                <div className="form-group">
                    <label>Indirizzo Wallet (automatico)</label>
                    <input type="text" className="form-input" value={walletAddress} readOnly disabled />
                </div>
                <hr style={{margin: '2rem 0', borderColor: '#333'}} />
                <h4>Profili Social (Opzionale)</h4>
                <div className="form-group">
                    <label>Sito Web</label>
                    <input type="url" name="website" className="form-input" onChange={handleInputChange} placeholder="https://..." />
                </div>
                <div className="form-group">
                    <label>Facebook</label>
                    <input type="url" name="facebook" className="form-input" onChange={handleInputChange} placeholder="https://facebook.com/..." />
                </div>
                <div className="form-group">
                    <label>Instagram</label>
                    <input type="url" name="instagram" className="form-input" onChange={handleInputChange} placeholder="https://instagram.com/..." />
                </div>
                <div className="form-group">
                    <label>Twitter / X</label>
                    <input type="url" name="twitter" className="form-input" onChange={handleInputChange} placeholder="https://x.com/..." />
                </div>
                <div className="form-group">
                    <label>TikTok</label>
                    <input type="url" name="tiktok" className="form-input" onChange={handleInputChange} placeholder="https://tiktok.com/..." />
                </div>
                <button type="submit" className="web3-button" disabled={isLoading} style={{width: '100%', marginTop: '1rem'}}>
                    {isLoading ? "Invio in corso..." : "Invia Richiesta di Attivazione"}
                </button>
                {status && status.type !== 'success' && (
                    <p style={{ marginTop: '1rem', color: status.type === 'error' ? '#ff4d4d' : '#888', textAlign: 'center' }}>
                        {status.message}
                    </p>
                )}
            </form>
        </div>
    );
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
            {/* Pulsante "Nuova Iscrizione" aggiunto qui per coerenza con l'immagine */}
            <div className="dashboard-actions">
                <button className="web3-button" style={{padding: '0.8rem 1.5rem', fontSize: '1rem'}}>Nuova Iscrizione</button>
            </div>
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
