// FILE: src/pages/AziendaPage.tsx
// VERSIONE DEFINITIVA: Utilizza i parametri corretti e la chiamata a Insight funzionante.

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
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
     .login-container { display: flex; justify-content: center; align-items: center; height: 100vh; }
     
     .dashboard-header-card {
        background-color: #212529;
        border: 1px solid #495057;
        border-radius: 12px;
        padding: 2rem;
        width: 100%;
        text-align: left;
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 1.5rem;
        margin-bottom: 2rem;
     }
     .dashboard-header-info h2 { margin-top: 0; margin-bottom: 1rem; font-size: 2rem; font-weight: 600; }
     .dashboard-header-info p { margin: 0.5rem 0; font-size: 1.1rem; color: #adb5bd; }
     .dashboard-header-info p strong { color: #f8f9fa; margin-left: 0.5rem; }
     .status-active { color: #28a745; font-weight: bold; }
     .recap-summary { text-align: left; padding: 15px; background-color: #2a2a2a; border: 1px solid #444; border-radius: 8px; margin-bottom: 20px;} 
     .recap-summary p { margin: 8px 0; word-break: break-word; } 
     .recap-summary p strong { color: #f8f9fa; } 

     .batch-list-container { width: 100%; margin: 2rem auto; }
     .batch-list-container h3 { border-bottom: 1px solid #495057; padding-bottom: 0.5rem; }
     .company-table .desktop-row { display: table-row; }
     .company-table .mobile-card-row { display: none; }
     
     @media (max-width: 768px) { 
       .app-container-full { padding: 0 1rem; } 
       .main-header-bar { flex-direction: column; align-items: flex-start; gap: 1rem; } 
       .dashboard-header-card { padding: 1.5rem; flex-direction: column; align-items: flex-start; }
       .dashboard-header-info h2 { font-size: 1.5rem; }
       .dashboard-actions { width: 100%; margin-top: 1rem; }
       .dashboard-actions .web3-button { width: 100%; }

       .company-table thead { display: none; }
       .company-table .desktop-row { display: none; }
       .company-table .mobile-card-row { display: block; margin-bottom: 1rem; border: 1px solid #3e3e3e; border-radius: 8px; background-color: #2c2c2c; }
       .company-table .mobile-card-row td { display: block; width: 100%; padding: 1rem; }
       .mobile-batch-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #444; padding-bottom: 0.75rem; margin-bottom: 0.75rem; }
       .mobile-batch-header h4 { margin: 0; font-size: 1.1rem; }
       .mobile-batch-body p { margin: 0.5rem 0; }
     } 
   `}</style>
);

// --- CONFIGURAZIONE GLOBALE (AGGIORNATA) ---
const CLIENT_ID = "023dd6504a82409b2bc7cb971fd35b16";
const CONTRACT_ADDRESS = "0xd0bad36896df719b26683e973f2fc6135f215d4e";

const client = createThirdwebClient({ clientId: CLIENT_ID });

const contract = getContract({
  client,
  chain: polygon,
  address: CONTRACT_ADDRESS,
  abi,
});

// --- TIPI E INTERFACCE ---
interface BatchData {
  id: string;
  batchId: bigint;
  name: string;
  description: string;
  date: string;
  location: string;
  isClosed: boolean;
  contributorName: string;
  imageIpfsHash: string;
}

// --- COMPONENTI ---

const RegistrationForm = ({ walletAddress }: { walletAddress: string }) => {
    const [formData, setFormData] = useState({
        companyName: "", contactEmail: "", sector: "", website: "", facebook: "", instagram: "", twitter: "", tiktok: "",
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
                <div className="form-group"><label>Nome Azienda *</label><input type="text" name="companyName" className="form-input" onChange={handleInputChange} required /></div>
                <div className="form-group"><label>Email di Contatto *</label><input type="email" name="contactEmail" className="form-input" onChange={handleInputChange} required /></div>
                <div className="form-group"><label>Settore di Attività *</label><select name="sector" className="form-input" onChange={handleInputChange} required><option value="">Seleziona un settore...</option><option value="Agroalimentare">Agroalimentare</option><option value="Moda e Tessile">Moda e Tessile</option><option value="Arredamento e Design">Arredamento e Design</option><option value="Farmaceutico">Farmaceutico</option><option value="Altro">Altro</option></select></div>
                <div className="form-group"><label>Indirizzo Wallet (automatico)</label><input type="text" className="form-input" value={walletAddress} readOnly disabled /></div>
                <hr style={{margin: '2rem 0', borderColor: '#333'}} />
                <h4>Profili Social (Opzionale)</h4>
                <div className="form-group"><label>Sito Web</label><input type="url" name="website" className="form-input" onChange={handleInputChange} placeholder="https://..." /></div>
                <div className="form-group"><label>Facebook</label><input type="url" name="facebook" className="form-input" onChange={handleInputChange} placeholder="https://facebook.com/..." /></div>
                <div className="form-group"><label>Instagram</label><input type="url" name="instagram" className="form-input" onChange={handleInputChange} placeholder="https://instagram.com/..." /></div>
                <div className="form-group"><label>Twitter / X</label><input type="url" name="twitter" className="form-input" onChange={handleInputChange} placeholder="https://x.com/..." /></div>
                <div className="form-group"><label>TikTok</label><input type="url" name="tiktok" className="form-input" onChange={handleInputChange} placeholder="https://tiktok.com/..." /></div>
                <button type="submit" className="web3-button" disabled={isLoading} style={{width: '100%', marginTop: '1rem'}}>{isLoading ? "Invio in corso..." : "Invia Richiesta di Attivazione"}</button>
                {status && status.type !== 'success' && (<p style={{ marginTop: '1rem', color: status.type === 'error' ? '#ff4d4d' : '#888', textAlign: 'center' }}>{status.message}</p>)}
            </form>
        </div>
    );
};

const DashboardHeader = ({ data, onNewInscriptionClick }: { data: readonly [string, bigint, boolean]; onNewInscriptionClick: () => void; }) => {
    const [companyName, credits] = data;
    return (
        <div className="dashboard-header-card">
            <div className="dashboard-header-info">
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

const BatchList = ({ batches, isLoading }: { batches: BatchData[], isLoading: boolean }) => {
    if (isLoading) { return <div className="centered-container"><p>Caricamento iscrizioni create...</p></div>; }
    if (batches.length === 0) { return <div className="centered-container"><p>Non hai ancora creato nessuna iscrizione.</p></div>; }
    return (
        <div className="batch-list-container">
            <h3>Le Tue Iscrizioni</h3>
            <table className="company-table">
                <thead><tr className="desktop-row"><th>ID Batch</th><th>Nome</th><th>Data</th><th>Luogo</th><th>Stato</th></tr></thead>
                <tbody>
                    {batches.map(batch => (
                        <React.Fragment key={batch.id}>
                            <tr className="desktop-row"><td>{batch.batchId.toString()}</td><td>{batch.name}</td><td>{batch.date || 'N/D'}</td><td>{batch.location || 'N/D'}</td><td>{batch.isClosed ? 'Chiuso' : 'Aperto'}</td></tr>
                            <tr className="mobile-card-row"><td><div className="mobile-batch-header"><h4>{batch.name}</h4><span>{batch.isClosed ? 'Chiuso' : 'Aperto'}</span></div><div className="mobile-batch-body"><p><strong>ID:</strong> {batch.batchId.toString()}</p><p><strong>Data:</strong> {batch.date || 'N/D'}</p><p><strong>Luogo:</strong> {batch.location || 'N/D'}</p></div></td></tr>
                        </React.Fragment>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

const getInitialFormData = () => ({ name: "", description: "", date: "", location: "" });
const truncateText = (text: string, maxLength: number) => { if (!text) return text; return text.length > maxLength ? text.substring(0, maxLength) + "..." : text; };

// --- COMPONENTE PRINCIPALE ---
export default function AziendaPage() {
  const account = useActiveAccount();
  const { mutate: sendTransaction, isPending } = useSendTransaction();
  
  const { data: contributorData, isLoading: isStatusLoading, isError, refetch: refetchContributorInfo } = useReadContract({
    contract,
    method: "function getContributorInfo(address) view returns (string, uint256, bool)",
    params: account ? [account.address] : undefined,
    queryOptions: { enabled: !!account },
  });

  const [modal, setModal] = useState<"init" | null>(null);
  const [formData, setFormData] = useState(getInitialFormData());
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [txResult, setTxResult] = useState<{ status: "success" | "error"; message: string; } | null>(null);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [currentStep, setCurrentStep] = useState(1);
  const [batches, setBatches] = useState<BatchData[]>([]);
  const [isLoadingBatches, setIsLoadingBatches] = useState(false);

  const fetchBatchesFromInsight = useCallback(async (contributorAddress: string) => {
    setIsLoadingBatches(true);
    setBatches([]);
    
    // 1. Costruisci l'URL base includendo l'indirizzo del contratto nel percorso
    const insightUrl = `https://polygon.insight.thirdweb.com/v1/events/${CONTRACT_ADDRESS}`;
    
    // 2. Rimuovi 'contract_address' dai parametri della query
    const params = new URLSearchParams({
      event_name: "BatchInitialized",
      "filters[contributor]": contributorAddress,
      order: "desc",
      limit: "100",
    });

    try {
      // 3. Esegui la chiamata con l'URL e i parametri corretti
      const response = await fetch(`${insightUrl}?${params.toString()}`, {
        method: "GET",
        headers: { "x-thirdweb-client-id": CLIENT_ID },
      });
      if (!response.ok) { throw new Error(`Errore API di Insight: ${response.statusText}`); }
      const data = await response.json();
      
      const formattedBatches = data.result.map((event: any): BatchData => ({
        id: event.data.batchId,
        batchId: BigInt(event.data.batchId),
        name: event.data.name,
        description: event.data.description,
        date: event.data.date,
        location: event.data.location,
        isClosed: event.data.isClosed,
        contributorName: event.data.contributorName,
        imageIpfsHash: event.data.imageIpfsHash,
      }));
      setBatches(formattedBatches);
    } catch (error) {
      console.error("Errore nel caricare i batch da Insight:", error);
      setBatches([]);
    } finally {
      setIsLoadingBatches(false);
    }
  }, []);

  useEffect(() => {
    if (contributorData && contributorData[2] && account?.address) {
      fetchBatchesFromInsight(account.address);
    }
  }, [contributorData, account?.address, fetchBatchesFromInsight]);

  const handleModalInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => setSelectedFile(e.target.files?.[0] || null);
  const openModal = () => { setFormData(getInitialFormData()); setSelectedFile(null); setCurrentStep(1); setTxResult(null); setModal("init"); };
  const handleCloseModal = () => setModal(null);
  const handleNextStep = () => { if (currentStep === 1 && !formData.name.trim()) { alert("Il campo 'Nome Iscrizione' è obbligatorio."); return; } if (currentStep < 6) setCurrentStep((prev) => prev + 1); };
  const handlePrevStep = () => { if (currentStep > 1) setCurrentStep((prev) => prev - 1); };
  
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
      onSuccess: async () => {
        setTxResult({ status: "success", message: "Iscrizione creata! Aggiorno i dati..." });
        if (contributorData && account?.address) {
          try {
            const newCredits = Number(contributorData[1]) - 1;
            await fetch('/api/activate-company', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'setCredits', walletAddress: account.address, credits: newCredits }),
            });
            refetchContributorInfo(); 
            fetchBatchesFromInsight(account.address);
          } catch (error) {
            console.error("Errore aggiornamento crediti su Firebase:", error);
          }
        }
        setLoadingMessage("");
      },
      onError: (err) => {
        setTxResult({ status: "error", message: err.message.toLowerCase().includes("insufficient funds") ? "Crediti Insufficienti" : "Errore nella transazione." });
        setLoadingMessage("");
      },
    });
  };

  if (!account) {
    return (
      <div className="login-container">
        <AziendaPageStyles />
        <ConnectButton client={client} chain={polygon} accountAbstraction={{ chain: polygon, sponsorGas: true }} wallets={[inAppWallet()]} connectButton={{ label: "Connettiti / Log In", style: { fontSize: "1.2rem", padding: "1rem 2rem" } }} />
      </div>
    );
  }

  const renderContent = () => {
    if (isStatusLoading) return <div className="centered-container"><p>Verifica stato account...</p></div>;
    if (isError) return <div className="centered-container"><p style={{ color: "red" }}>Errore nel recuperare i dati. Riprova.</p></div>;
    if (contributorData) {
      const isContributorActive = contributorData[2];
      if (isContributorActive) {
        return (
          <>
            <DashboardHeader data={contributorData} onNewInscriptionClick={openModal} />
            <BatchList batches={batches} isLoading={isLoadingBatches} />
          </>
        );
      } else {
        return <RegistrationForm walletAddress={account.address} />;
      }
    }
    return <div className="centered-container"><p>Impossibile determinare lo stato dell'account.</p></div>;
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
      <main className="main-content-full">{renderContent()}</main>

      {modal === "init" && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header"><h2>Nuova Iscrizione ({currentStep}/6)</h2></div>
            <div className="modal-body" style={{ minHeight: "350px" }}>
              {currentStep === 1 && ( <div> <div className="form-group"> <label> Nome Iscrizione <span style={{ color: "red", fontWeight: "bold" }}> * Obbligatorio </span> </label> <input type="text" name="name" value={formData.name} onChange={handleModalInputChange} className="form-input" maxLength={100} /> <small className="char-counter"> {formData.name.length} / 100 </small> </div> <div style={helpTextStyle}> <p><strong>ℹ️ Come scegliere il Nome Iscrizione</strong></p> <p>Il Nome Iscrizione è un'etichetta descrittiva che ti aiuta a identificare in modo chiaro ciò che stai registrando on-chain. Ad esempio:</p> <ul style={{ textAlign: "left", paddingLeft: "20px" }}> <li>Il nome di un prodotto o varietà: <em>Pomodori San Marzano 2025</em></li> <li>Il numero di lotto: <em>Lotto LT1025 – Olio EVO 3L</em></li> <li>Il nome di un contratto: <em>Contratto fornitura COOP – Aprile 2025</em></li><li>Una certificazione o audit: <em>Certificazione Bio ICEA 2025</em></li><li>Un riferimento amministrativo: <em>Ordine n.778 – Cliente NordItalia</em></li></ul> <p style={{ marginTop: "1rem" }}><strong>📌 Consiglio:</strong> scegli un nome breve ma significativo, che ti aiuti a ritrovare facilmente l’iscrizione anche dopo mesi o anni.</p> </div> </div> )}
              {currentStep === 2 && ( <div> <div className="form-group"> <label> Descrizione <span style={{ color: "#6c757d" }}> Non obbligatorio </span> </label> <textarea name="description" value={formData.description} onChange={handleModalInputChange} className="form-input" rows={4} maxLength={500}></textarea> <small className="char-counter"> {formData.description.length} / 500 </small> </div> <div style={helpTextStyle}> <p>Inserisci una descrizione del prodotto, lotto, contratto o altro elemento principale. Fornisci tutte le informazioni essenziali per identificarlo chiaramente nella filiera o nel contesto dell’iscrizione.</p> </div> </div> )}
              {currentStep === 3 && ( <div> <div className="form-group"> <label> Luogo <span style={{ color: "#6c757d" }}> Non obbligatorio </span> </label> <input type="text" name="location" value={formData.location} onChange={handleModalInputChange} className="form-input" maxLength={100} /> <small className="char-counter"> {formData.location.length} / 100 </small> </div> <div style={helpTextStyle}> <p>Inserisci il luogo di origine o di produzione del prodotto o lotto. Può essere una città, una regione, un'azienda agricola o uno stabilimento specifico per identificare con precisione dove è stato realizzato.</p> </div> </div> )}
              {currentStep === 4 && ( <div> <div className="form-group"> <label> Data <span style={{ color: "#6c757d" }}> Non obbligatorio </span> </label> <input type="date" name="date" value={formData.date} onChange={handleModalInputChange} className="form-input" max={today} /> </div> <div style={helpTextStyle}> <p>Inserisci una data, puoi utilizzare il giorno attuale o una data precedente alla conferma di questa Iscrizione.</p> </div> </div> )}
              {currentStep === 5 && ( <div> <div className="form-group"> <label> Immagine <span style={{ color: "#6c757d" }}> Non obbligatorio </span> </label> <input type="file" name="image" onChange={handleFileChange} className="form-input" accept="image/png, image/jpeg, image/webp" /> <small style={{ marginTop: "4px" }}> Formati: PNG, JPG, WEBP. Max: 5 MB. </small> {selectedFile && ( <p className="file-name-preview"> File: {selectedFile.name} </p> )} </div> <div style={helpTextStyle}> <p>Carica un’immagine rappresentativa del prodotto, lotto, contratto, etc. Rispetta i formati e i limiti di peso.<br/><strong>Consiglio:</strong> Per una visualizzazione ottimale, usa un'immagine quadrata (formato 1:1).</p> </div> </div> )}
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

      {isProcessing && (<TransactionStatusModal status={"loading"} message={loadingMessage} onClose={() => {}} />)}
      {txResult && (<TransactionStatusModal status={txResult.status} message={txResult.message} onClose={() => { if (txResult.status === "success") handleCloseModal(); setTxResult(null); }} />)}
    </div>
  );
}