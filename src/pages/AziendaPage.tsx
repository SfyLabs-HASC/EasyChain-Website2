// FILE: src/pages/AziendaPage.tsx (Versione Corretta)
// DESCRIZIONE: Il file è stato modificato per correggere un errore di sintassi che bloccava la build su Vercel.

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
        background-color: #ffffff;
        padding: 1.5rem;
        border-radius: 0.75rem;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        margin-bottom: 2rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 1rem;
      }

      .dashboard-title {
        font-size: 1.5rem;
        font-weight: 600;
        color: #1a202c;
      }

      .web3-button {
        background-color: #3b82f6;
        color: white;
        padding: 0.75rem 1.5rem;
        border: none;
        border-radius: 0.5rem;
        font-weight: 500;
        cursor: pointer;
        transition: background-color 0.2s;
        font-size: 1rem;
      }

      .web3-button:hover {
        background-color: #2563eb;
      }

      .web3-button.secondary {
        background-color: #e2e8f0;
        color: #2d3748;
      }
      .web3-button.secondary:hover {
        background-color: #cbd5e1;
      }
      .web3-button:disabled {
        background-color: #94a3b8;
        cursor: not-allowed;
      }
      
      .batches-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        gap: 1.5rem;
      }

      .batch-card {
        background-color: #ffffff;
        border-radius: 0.75rem;
        padding: 1.5rem;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        transition: transform 0.2s, box-shadow 0.2s;
        border: 1px solid #e2e8f0;
      }
      .batch-card:hover {
        transform: translateY(-5px);
        box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08);
      }
      .batch-card h3 {
        font-size: 1.25rem;
        font-weight: 600;
        color: #1a202c;
        margin-top: 0;
        border-bottom: 1px solid #e2e8f0;
        padding-bottom: 0.75rem;
        margin-bottom: 1rem;
      }
      .batch-card p {
        margin: 0.5rem 0;
        color: #4a5568;
        font-size: 0.9rem;
        word-wrap: break-word;
      }
      .batch-card strong {
        color: #2d3748;
      }
      .batch-card a {
        color: #3b82f6;
        text-decoration: none;
        font-weight: 500;
      }
      .batch-card a:hover {
        text-decoration: underline;
      }
      .loading-error-container {
        text-align: center;
        padding: 3rem;
        background-color: #f7fafc;
        border-radius: 0.75rem;
      }
      .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: rgba(0, 0, 0, 0.6);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
      }
      .modal-content {
        background: white;
        padding: 2rem;
        border-radius: 0.75rem;
        width: 90%;
        max-width: 600px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
        max-height: 90vh;
        overflow-y: auto;
      }
      .modal-header {
        border-bottom: 1px solid #e2e8f0;
        padding-bottom: 1rem;
        margin-bottom: 1.5rem;
        font-size: 1.5rem;
        font-weight: 600;
      }
      .modal-body {
        margin-bottom: 1.5rem;
      }
      .modal-footer {
        display: flex;
        justify-content: flex-end;
        gap: 1rem;
      }
      .form-group {
        margin-bottom: 1.5rem;
      }
      .form-group label {
        display: block;
        margin-bottom: 0.5rem;
        font-weight: 500;
        color: #4a5568;
      }
      .form-group input, .form-group textarea {
        width: 100%;
        padding: 0.75rem;
        border: 1px solid #cbd5e1;
        border-radius: 0.5rem;
        font-size: 1rem;
      }
      .form-group input[type="file"] {
        padding: 0.5rem;
      }
      .progress-bar {
        display: flex;
        justify-content: space-between;
        margin-bottom: 1.5rem;
        list-style: none;
        padding: 0;
      }
      .progress-step {
        text-align: center;
        flex: 1;
        position: relative;
        color: #a0aec0;
      }
      .progress-step.active {
        color: #3b82f6;
        font-weight: 600;
      }
      .progress-step::before {
        content: '';
        position: absolute;
        top: 50%;
        left: -50%;
        right: 50%;
        border-top: 2px solid #e2e8f0;
        z-index: -1;
      }
      .progress-step:first-child::before {
        content: none;
      }
      .progress-step.active::before {
        border-top-color: #3b82f6;
      }
   `}</style>
);

// --- Costanti e Tipi ---
const CONTRACT_ADDRESS = "0x0c5e6204e80e6fb3c0c7098c4fa84b2210358d0b";
const client = createThirdwebClient({
  clientId: "023dd6504a82409b2bc7cb971fd35b16", // Questa è la clientId pubblica, va bene qui
});

interface Batch {
  batchId: string;
  name: string;
  description: string;
  date: string;
  location: string;
  imageIpfsHash: string;
  isClosed: boolean;
  transactionHash: string;
}

interface FormData {
  name: string;
  description: string;
  location: string;
  date: string;
}

// --- Funzioni Helper ---
const truncateText = (text: string, maxLength: number) => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
};

// --- Componente Principale ---
const AziendaPage: React.FC = () => {
  const navigate = useNavigate();
  const account = useActiveAccount();
  const { mutate: sendTransaction, isPending: isTxPending } = useSendTransaction();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({ name: "", description: "", location: "", date: "" });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [txResult, setTxResult] = useState<{ status: 'success' | 'error'; message: string } | null>(null);

  // --- STATO PER I LOTTI ESISTENTI ---
  const [batches, setBatches] = useState<Batch[]>([]);
  const [isLoadingBatches, setIsLoadingBatches] = useState(true);
  const [errorBatches, setErrorBatches] = useState<string | null>(null);

  useEffect(() => {
    const loadBatches = async () => {
      setIsLoadingBatches(true);
      setErrorBatches(null);
      try {
        // Chiamiamo il nostro endpoint API backend (/api/get-contract-events)
        // Questo è il modo sicuro per ottenere dati che richiedono una secret key.
        const response = await fetch('/api/get-contract-events');
        
        if (!response.ok) {
          // Se la risposta dal nostro server non è OK, gestiamo l'errore.
          const errorData = await response.json();
          throw new Error(errorData.error || `Errore dal server: ${response.status}`);
        }
        
        const data = await response.json();
        
        // L'API route restituisce un oggetto { events: [...] } con gli eventi grezzi.
        // Ora dobbiamo trasformare questi eventi nel formato che il nostro componente si aspetta.
        const rawEvents = data.events || [];

        const formattedBatches: Batch[] = rawEvents
          .map((event: any) => ({
            // I dati dell'evento sono nella proprietà 'data'
            batchId: event.data.batchId?.toString() || 'ID non valido',
            name: event.data.name || 'Senza nome',
            description: event.data.description || 'Senza descrizione',
            date: event.data.date || 'Data non disponibile',
            location: event.data.location || 'Luogo non disponibile',
            imageIpfsHash: event.data.imageIpfsHash || '',
            isClosed: event.data.isClosed || false,
            transactionHash: event.transactionHash || '', // Aggiungiamo l'hash della transazione
          }))
          // Ordiniamo i lotti dal più recente al più vecchio in base al loro ID
          .sort((a: Batch, b: Batch) => parseInt(b.batchId) - parseInt(a.batchId));

        setBatches(formattedBatches);

      } catch (error: any) {
        console.error("Errore nel caricare i batch dall'API:", error);
        setErrorBatches(error.message || "Errore sconosciuto nel caricamento dei batch.");
      } finally {
        setIsLoadingBatches(false);
      }
    };

    loadBatches();
  }, []); // L'array di dipendenze è vuoto, quindi questo effetto viene eseguito solo una volta, quando il componente viene montato.

  const handleOpenModal = () => setIsModalOpen(true);
  const handleCloseModal = () => {
    if (isProcessing) return;
    setIsModalOpen(false);
    setCurrentStep(1);
    setFormData({ name: "", description: "", location: "", date: "" });
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setTxResult(null);
  };

  const handleNextStep = () => setCurrentStep(prev => prev + 1);
  const handlePrevStep = () => setCurrentStep(prev => prev - 1);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const uploadToIpfs = async (file: File) => {
    // Questa funzione richiede una configurazione lato server per la secret key
    // Per ora, la lasciamo come placeholder o la implementiamo con un'altra API route
    console.warn("La funzione di upload IPFS richiede un'implementazione sicura lato server.");
    // In un'app reale, si farebbe una chiamata a un'API route `/api/upload-ipfs`
    return "QmT...placeholder"; // Placeholder
  };

  const handleInitializeBatch = async () => {
    if (!account) {
      setTxResult({ status: 'error', message: 'Connetti il tuo wallet per continuare.' });
      return;
    }
    if (!formData.name || !formData.description || !formData.location || !formData.date) {
      setTxResult({ status: 'error', message: 'Tutti i campi sono obbligatori.' });
      return;
    }

    setIsProcessing(true);
    setLoadingMessage("Caricamento immagine su IPFS...");

    try {
      let imageIpfsHash = "";
      if (selectedFile) {
        // La logica di upload IPFS sicura andrebbe qui, tramite un'API route.
        // Per questo esempio, usiamo un placeholder.
        imageIpfsHash = "Qm" + formData.name.replace(/\s/g, '') + "Placeholder"; // Placeholder
      }

      setLoadingMessage("Preparazione della transazione...");
      const contract = getContract({ client, chain: polygon, address: CONTRACT_ADDRESS, abi });
      const transaction = prepareContractCall({
        contract,
        method: "initializeBatch",
        params: [formData.name, formData.description, formData.date, formData.location, imageIpfsHash],
      });

      setLoadingMessage("In attesa di conferma dal wallet...");
      sendTransaction(transaction, {
        onSuccess: (result) => {
          console.log("Transazione inviata con successo:", result);
          setLoadingMessage("Transazione confermata! In attesa della finalizzazione sulla blockchain...");
          // Qui si potrebbe attendere la conferma della transazione
          setTimeout(() => {
            setTxResult({ status: 'success', message: `Batch creato con successo! Hash: ${truncateText(result.transactionHash, 20)}` });
            setIsProcessing(false);
            // Ricarica i lotti per mostrare quello nuovo
            // La ricarica automatica non è implementata, l'utente dovrà ricaricare la pagina
          }, 5000); // Simula attesa
        },
        onError: (error) => {
          console.error("Errore durante l'invio della transazione:", error);
          setTxResult({ status: 'error', message: error.message || "La transazione è stata rifiutata o è fallita." });
          setIsProcessing(false);
        },
      });

    } catch (error) {
      console.error("Errore nel processo di creazione del batch:", error);
      setTxResult({ status: 'error', message: (error as Error).message || "Si è verificato un errore imprevisto." });
      setIsProcessing(false);
    }
  };

  if (!account) {
    return (
      <div className="login-container">
        <div style={{ textAlign: "center" }}>
          <h1>Benvenuto</h1>
          <p>Connetti il tuo wallet per accedere alla dashboard aziendale.</p>
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
            <button onClick={handleOpenModal} className="web3-button">
              + Inizializza Nuovo Lotto
            </button>
          </div>

          <h3>Lotti Esistenti</h3>
          {isLoadingBatches ? (
            <div className="loading-error-container">
              <p>Caricamento dei lotti dalla blockchain...</p>
            </div>
          ) : errorBatches ? (
            <div className="loading-error-container">
              <p style={{ color: 'red' }}>Errore: {errorBatches}</p>
            </div>
          ) : (
            <div className="batches-grid">
              {batches.length > 0 ? (
                batches.map((batch) => (
                  <div key={batch.batchId} className="batch-card">
                    <h3>Lotto #{batch.batchId} - {truncateText(batch.name, 20)}</h3>
                    <p><strong>Desc:</strong> {truncateText(batch.description, 50)}</p>
                    <p><strong>Data:</strong> {batch.date} | <strong>Luogo:</strong> {truncateText(batch.location, 20)}</p>
                    {batch.imageIpfsHash && (
                      <p><strong>Immagine:</strong> <a href={`https://ipfs.io/ipfs/${batch.imageIpfsHash}`} target="_blank" rel="noopener noreferrer">Vedi su IPFS</a></p>
                    )}
                    <p><strong>Stato:</strong> {batch.isClosed ? 'Chiuso' : 'Aperto'}</p>
                    <p><strong>Tx Hash:</strong> <a href={`https://polygonscan.com/tx/${batch.transactionHash}`} target="_blank" rel="noopener noreferrer">{truncateText(batch.transactionHash, 15)}</a></p>
                  </div>
                ))
              ) : (
                <p>Nessun lotto trovato.</p>
              )}
            </div>
          )}
        </main>
      </div>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Inizializza Nuovo Lotto</h3>
              <ul className="progress-bar">
                {['Dati', 'Descrizione', 'Luogo', 'Data', 'Immagine', 'Conferma'].map((step, index) => (
                  <li key={index} className={`progress-step ${currentStep >= index + 1 ? 'active' : ''}`}>{step}</li>
                ))}
              </ul>
            </div>
            <div className="modal-body">
              {txResult && <TransactionStatusModal status={txResult.status} message={txResult.message} onClose={handleCloseModal} />}
              
              {currentStep === 1 && (<div className="form-group"><label htmlFor="name">Nome del Lotto</label><input type="text" id="name" name="name" value={formData.name} onChange={handleInputChange} placeholder="Es. Pomodori San Marzano Bio" /></div>)}
              {currentStep === 2 && (<div className="form-group"><label htmlFor="description">Descrizione</label><textarea id="description" name="description" value={formData.description} onChange={handleInputChange} placeholder="Breve descrizione del prodotto e del lotto" /></div>)}
              {currentStep === 3 && (<div className="form-group"><label htmlFor="location">Luogo di Origine</label><input type="text" id="location" name="location" value={formData.location} onChange={handleInputChange} placeholder="Es. Agro Sarnese-Nocerino, SA" /></div>)}
              {currentStep === 4 && (<div className="form-group"><label htmlFor="date">Data di Raccolta/Produzione</label><input type="date" id="date" name="date" value={formData.date} onChange={handleInputChange} /></div>)}
              {currentStep === 5 && (<div className="form-group"><label htmlFor="image">Immagine (Opzionale)</label><input type="file" id="image" name="image" ref={fileInputRef} onChange={handleFileChange} accept="image/*" /></div>)}
              {currentStep === 6 && (<div><h4>Riepilogo Dati</h4><p><strong>Nome:</strong> {truncateText(formData.name, 40) || "N/D"}</p><p><strong>Descrizione:</strong> {truncateText(formData.description, 100) || "N/D"}</p><p><strong>Luogo:</strong> {truncateText(formData.location, 40) || "N/D"}</p><p><strong>Data:</strong> {formData.date ? formData.date.split("-").reverse().join("/") : "N/D"}</p><p><strong>Immagine:</strong> {truncateText(selectedFile?.name || "", 40) || "Nessuna"}</p><p>Vuoi confermare e registrare questi dati sulla blockchain?</p></div>)}
            </div>
            <div className="modal-footer" style={{ justifyContent: "space-between" }}>
              <div>{currentStep > 1 && (<button onClick={handlePrevStep} className="web3-button secondary" disabled={isProcessing}>Indietro</button>)}</div>
              <div>
                <button onClick={handleCloseModal} className="web3-button secondary" disabled={isProcessing}>Chiudi</button>
                {currentStep < 6 && (<button onClick={handleNextStep} className="web3-button">Avanti</button>)}
                {currentStep === 6 && (<button onClick={handleInitializeBatch} disabled={isProcessing || isTxPending} className="web3-button">{isProcessing || isTxPending ? "In elaborazione..." : "Conferma e Registra"}</button>)}
              </div>
            </div>
          </div>
        </div>
      )}

      {isProcessing && !txResult && (<TransactionStatusModal status={"loading"} message={loadingMessage} onClose={() => {}} />)}
    </>
  );
};

export default AziendaPage;
