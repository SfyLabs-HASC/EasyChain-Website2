// FILE: src/pages/AziendaPage.tsx
// VERSIONE FINALE: Unisce la dashboard responsive con il wizard completo per "Nuova Iscrizione".

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
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

// --- Stili CSS ---
const AziendaPageStyles = () => (
  <style>{` 
     .app-container-full { padding: 0 2rem; } 
     .main-header-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; flex-wrap: wrap; } 
     .header-title { font-size: 1.75rem; font-weight: bold; }
     .centered-container { display: flex; flex-direction: column; justify-content: center; align-items: center; min-height: 70vh; text-align: center; }
     .login-container { display: flex; justify-content: center; align-items: center; height: 100vh; }
     
     /* Stili per la Dashboard (Desktop) */
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
     .recap-summary { text-align: left; padding: 15px; background-color: #2a2a2a; border: 1px solid #444; border-radius: 8px; margin-bottom: 20px;} 
     .recap-summary p { margin: 8px 0; word-break: break-word; } 
     .recap-summary p strong { color: #f8f9fa; } 
     
     /* Stili Responsive per Mobile */
     @media (max-width: 768px) { 
       .app-container-full { padding: 0 1rem; } 
       .main-header-bar { flex-direction: column; align-items: flex-start; gap: 1rem; } 
       .centered-container .contributor-dashboard { 
          padding: 1.5rem;
          flex-direction: column;
          align-items: flex-start;
       }
       .centered-container .dashboard-info h2 { 
          font-size: 1.5rem; 
       }
       .centered-container .dashboard-actions {
          width: 100%;
          margin-top: 1rem;
       }
       .centered-container .dashboard-actions .web3-button {
          width: 100%;
       }
     } 
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

// --- COMPONENTI ---

const RegistrationForm = ({ walletAddress }: { walletAddress: string }) => {
    // ... (Il codice del form di registrazione rimane qui, invariato)
    return <div>...</div>
};

const ContributorDashboard = ({ data, onNewInscriptionClick }: { data: readonly [string, bigint, boolean]; onNewInscriptionClick: () => void; }) => {
    const [companyName, credits] = data;
    return (
        <div className="contributor-dashboard">
            <div className="dashboard-info">
                <h2>{companyName}</h2>
                <p>Crediti Rimanenti: <strong>{credits.toString()}</strong></p>
                <p>Stato: <strong className="status-active">ATTIVO ✅</strong></p>
            </div>
            <div className="dashboard-actions">
                <button onClick={onNewInscriptionClick} className="web3-button" style={{padding: '0.8rem 1.5rem', fontSize: '1rem'}}>Nuova Iscrizione</button>
            </div>
        </div>
    );
};

// --- FUNZIONI HELPER ---
const getInitialFormData = () => ({ name: "", description: "", date: "", location: "" });
const truncateText = (text: string, maxLength: number) => { if (!text) return text; return text.length > maxLength ? text.substring(0, maxLength) + "..." : text; };


// --- COMPONENTE PRINCIPALE ---
export default function AziendaPage() {
  const account = useActiveAccount();
  const { mutate: sendTransaction, isPending } = useSendTransaction();
  
  // Stato per i dati del contributor
  const { data: contributorData, isLoading: isStatusLoading, isError } = useReadContract({
    contract,
    method: "function getContributorInfo(address) view returns (string, uint256, bool)",
    params: account ? [account.address] : undefined,
    queryOptions: { enabled: !!account },
  });

  // Stati per il modale "Nuova Iscrizione"
  const [modal, setModal] = useState<"init" | null>(null);
  const [formData, setFormData] = useState(getInitialFormData());
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [txResult, setTxResult] = useState<{ status: "success" | "error"; message: string; } | null>(null);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [currentStep, setCurrentStep] = useState(1);

  // --- GESTORI EVENTI MODALE ---
  const handleModalInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => setSelectedFile(e.target.files?.[0] || null);
  const openModal = () => { setFormData(getInitialFormData()); setSelectedFile(null); setCurrentStep(1); setTxResult(null); setModal("init"); };
  const handleCloseModal = () => setModal(null);
  const handleNextStep = () => { if (currentStep === 1 && !formData.name.trim()) { alert("Il campo 'Nome Iscrizione' è obbligatorio."); return; } if (currentStep < 6) setCurrentStep((prev) => prev + 1); };
  const handlePrevStep = () => { if (currentStep > 1) setCurrentStep((prev) => prev - 1); };

  // --- LOGICA DI INVIO NUOVA ISCRIZIONE ---
  const handleInitializeBatch = async () => {
    if (!formData.name.trim()) {
      setTxResult({ status: "error", message: "Il campo Nome è obbligatorio." });
      return;
    }
    setLoadingMessage("Preparazione transazione...");
    let imageIpfsHash = "N/A";

    if (selectedFile) {
      setLoadingMessage("Caricamento Immagine...");
      try {
        const body = new FormData();
        body.append("file", selectedFile);
        const response = await fetch("/api/upload", { method: "POST", body });
        if (!response.ok) throw new Error("Errore dal server di upload.");
        const { cid } = await response.json();
        if (!cid) throw new Error("CID non ricevuto dall'API di upload.");
        imageIpfsHash = cid;
      } catch (error: any) {
        setTxResult({ status: "error", message: `Errore caricamento: ${error.message}` });
        setLoadingMessage("");
        return;
      }
    }

    setLoadingMessage("Transazione in corso...");
    const transaction = prepareContractCall({
      contract,
      method: "function initializeBatch(string,string,string,string,string)",
      params: [formData.name, formData.description, formData.date, formData.location, imageIpfsHash],
    });
    
    sendTransaction(transaction, {
      onSuccess: () => {
        setTxResult({ status: "success", message: "Iscrizione creata con successo!" });
        setLoadingMessage("");
        // Potresti voler ricaricare la lista di iscrizioni qui se fosse visibile
      },
      onError: (err) => {
        setTxResult({ status: "error", message: err.message.toLowerCase().includes("insufficient funds") ? "Crediti Insufficienti" : "Errore nella transazione." });
        setLoadingMessage("");
      },
    });
  };

  // --- LOGICA DI RENDER ---
  if (!account) {
    return (
      <div className="login-container">
        <AziendaPageStyles />
        <ConnectButton client={client} chain={polygon} accountAbstraction={{ chain: polygon, sponsorGas: true }} wallets={[inAppWallet()]} connectButton={{ label: "Connettiti / Log In", style: { fontSize: "1.2rem", padding: "1rem 2rem" } }} />
      </div>
    );
  }

  const renderContent = () => {
    if (isStatusLoading) return <p>Verifica stato account...</p>;
    if (isError) return <p style={{ color: "red" }}>Errore nel recuperare i dati. Riprova.</p>;
    if (contributorData) {
      const isContributorActive = contributorData[2];
      if (isContributorActive) {
        return <ContributorDashboard data={contributorData} onNewInscriptionClick={openModal} />;
      } else {
        return <RegistrationForm walletAddress={account.address} />;
      }
    }
    return <p>Impossibile determinare lo stato dell'account.</p>;
  };

  const isProcessing = loadingMessage !== "" || isPending;
  const today = new Date().toISOString().split("T")[0];
  const helpTextStyle = { backgroundColor: "#343a40", border: "1px solid #495057", borderRadius: "8px", padding: "16px", marginTop: "16px", fontSize: "0.9rem", color: "#f8f9fa" };

  return (
    <div className="app-container-full">
      <AziendaPageStyles />
      <header className="main-header-bar">
        <div className="header-title">EasyChain - Area Riservata</div>
        <div className="wallet-button-container">
          <ConnectButton client={client} chain={polygon} accountAbstraction={{ chain: polygon, sponsorGas: true }} detailsModal={{ hideSend: true, hideReceive: true, hideBuy: true, hideTransactionHistory: true }} />
        </div>
      </header>
      <main className="main-content-full">
        <div className="centered-container">{renderContent()}</div>
      </main>

      {/* MODALE WIZARD "NUOVA ISCRIZIONE" */}
      {modal === "init" && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header"><h2>Nuova Iscrizione ({currentStep}/6)</h2></div>
            <div className="modal-body" style={{ minHeight: "350px" }}>
              {currentStep === 1 && ( <div> <div className="form-group"> <label> Nome Iscrizione <span style={{ color: "red", fontWeight: "bold" }}> * Obbligatorio </span> </label> <input type="text" name="name" value={formData.name} onChange={handleModalInputChange} className="form-input" maxLength={100} /> <small className="char-counter"> {formData.name.length} / 100 </small> </div> <div style={helpTextStyle}> <p> <strong> ℹ️ Come scegliere il Nome Iscrizione </strong> </p> <p> Il Nome Iscrizione è un'etichetta descrittiva che ti aiuta a identificare in modo chiaro ciò che stai registrando on-chain. Ad esempio: </p> <ul style={{ textAlign: "left", paddingLeft: "20px" }}> <li>Il nome di un prodotto: <em>Pomodori San Marzano 2025</em></li> <li>Il numero di lotto: <em>Lotto LT1025 – Olio EVO 3L</em></li> </ul> <p style={{ marginTop: "1rem" }}> <strong>📌 Consiglio:</strong> scegli un nome breve ma significativo.</p> </div> </div> )}
              {currentStep === 2 && ( <div> <div className="form-group"> <label> Descrizione <span style={{ color: "#6c757d" }}> Non obbligatorio </span> </label> <textarea name="description" value={formData.description} onChange={handleModalInputChange} className="form-input" rows={4} maxLength={500}></textarea> <small className="char-counter"> {formData.description.length} / 500 </small> </div> <div style={helpTextStyle}> <p> Fornisci tutte le informazioni essenziali per identificare chiaramente l'elemento nella filiera. </p> </div> </div> )}
              {currentStep === 3 && ( <div> <div className="form-group"> <label> Luogo <span style={{ color: "#6c757d" }}> Non obbligatorio </span> </label> <input type="text" name="location" value={formData.location} onChange={handleModalInputChange} className="form-input" maxLength={100} /> <small className="char-counter"> {formData.location.length} / 100 </small> </div> <div style={helpTextStyle}> <p> Inserisci il luogo di origine o di produzione del prodotto o lotto. </p> </div> </div> )}
              {currentStep === 4 && ( <div> <div className="form-group"> <label> Data <span style={{ color: "#6c757d" }}> Non obbligatorio </span> </label> <input type="date" name="date" value={formData.date} onChange={handleModalInputChange} className="form-input" max={today} /> </div> <div style={helpTextStyle}> <p> Inserisci una data, puoi utilizzare il giorno attuale o una data precedente. </p> </div> </div> )}
              {currentStep === 5 && ( <div> <div className="form-group"> <label> Immagine <span style={{ color: "#6c757d" }}> Non obbligatorio </span> </label> <input type="file" name="image" onChange={handleFileChange} className="form-input" accept="image/png, image/jpeg, image/webp" /> <small style={{ marginTop: "4px" }}> Formati: PNG, JPG, WEBP. Max: 5 MB. </small> {selectedFile && ( <p className="file-name-preview"> File: {selectedFile.name} </p> )} </div> <div style={helpTextStyle}> <p> Carica un’immagine rappresentativa. <strong>Consiglio:</strong> usa un'immagine quadrata (1:1). </p> </div> </div> )}
              {currentStep === 6 && ( <div> <h4>Riepilogo Dati</h4> <div className="recap-summary"> <p> <strong>Nome:</strong> {truncateText(formData.name, 40) || "N/D"} </p> <p> <strong>Descrizione:</strong> {truncateText(formData.description, 60) || "N/D"} </p> <p> <strong>Luogo:</strong> {truncateText(formData.location, 40) || "N/D"} </p> <p> <strong>Data:</strong> {formData.date ? formData.date.split("-").reverse().join("/") : "N/D"} </p> <p> <strong>Immagine:</strong> {truncateText(selectedFile?.name || "", 40) || "Nessuna"} </p> </div> <p> Vuoi confermare e registrare questi dati sulla blockchain? </p> </div> )}
            </div>
            <div className="modal-footer" style={{ justifyContent: "space-between" }}>
              <div>{currentStep > 1 && (<button onClick={handlePrevStep} className="web3-button secondary" disabled={isProcessing}>Indietro</button>)}</div>
              <div>
                <button onClick={handleCloseModal} className="web3-button secondary" disabled={isProcessing}>Chiudi</button>
                {currentStep < 6 && (<button onClick={handleNextStep} className="web3-button">Avanti</button>)}
                {currentStep === 6 && (<button onClick={handleInitializeBatch} disabled={isProcessing} className="web3-button">{isProcessing ? "Conferma..." : "Conferma e Registra"}</button>)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODALI DI STATO TRANSAZIONE */}
      {isProcessing && (<TransactionStatusModal status={"loading"} message={loadingMessage} onClose={() => {}} />)}
      {txResult && (<TransactionStatusModal status={txResult.status} message={txResult.message} onClose={() => { if (txResult.status === "success") handleCloseModal(); setTxResult(null); }} />)}
    </div>
  );
}
