// FILE: src/pages/AziendaPage.tsx
// DESCRIZIONE: Versione aggiornata che passa l'indirizzo dell'utente loggato all'API
// e formatta correttamente i dati del batch ricevuti.

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ConnectButton,
  useActiveAccount, // Hook per ottenere l'account attivo
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
        word-wrap: break-word;
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
   `}</style>
);

const truncateText = (text: string, maxLength: number) => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
};

// Interfaccia Batch aggiornata per chiarezza
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

const CONTRACT_ADDRESS = "0x0c5e6204e80e6fb3c0c7098c4fa84b2210358d0b";
const client = createThirdwebClient({
  clientId: "023dd6504a82409b2bc7cb971fd35b16",
});


const AziendaPage: React.FC = () => {
  const navigate = useNavigate();
  const account = useActiveAccount(); // Otteniamo l'oggetto account completo
  const { mutate: sendTransaction, isPending: isTxPending } = useSendTransaction();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({ name: "", description: "", location: "", date: "" });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [txResult, setTxResult] = useState<{ status: 'success' | 'error'; message: string } | null>(null);

  const [batches, setBatches] = useState<Batch[]>([]);
  const [isLoadingBatches, setIsLoadingBatches] = useState(true);
  const [errorBatches, setErrorBatches] = useState<string | null>(null);

  // useEffect aggiornato per passare l'account e gestire lo stato di login
  useEffect(() => {
    // Se non c'è un account loggato, non fare nulla.
    if (!account) {
      setBatches([]); // Svuota i lotti se l'utente si disconnette
      setIsLoadingBatches(false);
      return;
    }

    const loadBatches = async () => {
      setIsLoadingBatches(true);
      setErrorBatches(null);
      try {
        // Passiamo l'indirizzo dell'account come parametro di query
        const response = await fetch(`/api/get-contract-events?userAddress=${account.address}`);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Errore dal server: ${response.status}`);
        }
        
        const data = await response.json();
        const rawEvents = data.events || [];

        // Mappatura corretta dei dati dell'evento
        const formattedBatches: Batch[] = rawEvents.map((event: any) => ({
            // I dati specifici dell'evento sono nella proprietà 'data'
            batchId: event.data.batchId, // Non serve più toString() grazie a serializeBigInts
            name: event.data.name || 'Senza nome',
            description: event.data.description || 'Senza descrizione',
            date: event.data.date || 'Data non disponibile',
            location: event.data.location || 'Luogo non disponibile',
            imageIpfsHash: event.data.imageIpfsHash || '',
            isClosed: event.data.isClosed || false,
            transactionHash: event.transactionHash || '',
          }))
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
  }, [account]); // L'effetto dipende da 'account'. Si rieseguirà se l'utente si connette/disconnette/cambia account.


  // --- Logica per il modale e l'invio di transazioni (NON MODIFICATA) ---
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
    setLoadingMessage("Preparazione della transazione...");

    try {
      // La logica di upload IPFS sicura andrebbe qui, tramite un'API route.
      let imageIpfsHash = ""; 
      if (selectedFile) {
         // Placeholder
        imageIpfsHash = "Qm...placeholder";
      }

      const contract = getContract({ client, chain: polygon, address: CONTRACT_ADDRESS, abi });
      const transaction = prepareContractCall({
        contract,
        method: "initializeBatch",
        params: [formData.name, formData.description, formData.date, formData.location, imageIpfsHash],
      });

      setLoadingMessage("In attesa di conferma dal wallet...");
      sendTransaction(transaction, {
        onSuccess: (result) => {
          setLoadingMessage("Transazione confermata!");
          setTxResult({ status: 'success', message: `Batch creato con successo! Hash: ${truncateText(result.transactionHash, 20)}` });
          setIsProcessing(false);
          // Potresti voler ricaricare i lotti qui
        },
        onError: (error) => {
          setTxResult({ status: 'error', message: error.message || "La transazione è stata rifiutata o è fallita." });
          setIsProcessing(false);
        },
      });

    } catch (error) {
      setTxResult({ status: 'error', message: (error as Error).message || "Si è verificato un errore imprevisto." });
      setIsProcessing(false);
    }
  };


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
            <button onClick={handleOpenModal} className="web3-button">
              + Inizializza Nuovo Lotto
            </button>
          </div>

          <h3>I Miei Lotti Inizializzati</h3>
          {isLoadingBatches ? (
            <div className="loading-error-container"><p>Caricamento dei tuoi lotti...</p></div>
          ) : errorBatches ? (
            <div className="loading-error-container"><p style={{ color: 'red' }}>Errore: {errorBatches}</p></div>
          ) : (
            <div className="batches-grid">
              {batches.length > 0 ? (
                // Visualizzazione corretta dei dati
                batches.map((batch) => (
                  <div key={batch.batchId} className="batch-card">
                    <h3>Lotto #{batch.batchId} - {batch.name}</h3>
                    <p><strong>Descrizione:</strong> {batch.description}</p>
                    <p><strong>Data:</strong> {batch.date}</p>
                    <p><strong>Luogo:</strong> {batch.location}</p>
                    {batch.imageIpfsHash && (
                      <p><strong>Immagine:</strong> <a href={`https://ipfs.io/ipfs/${batch.imageIpfsHash}`} target="_blank" rel="noopener noreferrer">Vedi su IPFS</a></p>
                    )}
                    <p><strong>Stato:</strong> {batch.isClosed ? 'Chiuso' : 'Aperto'}</p>
                    <p><strong>Tx Hash:</strong> <a href={`https://polygonscan.com/tx/${batch.transactionHash}`} target="_blank" rel="noopener noreferrer">{truncateText(batch.transactionHash, 15)}</a></p>
                  </div>
                ))
              ) : (
                <p>Non hai ancora inizializzato nessun lotto con questo account.</p>
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
            </div>
            <div className="modal-body">
              {txResult && <TransactionStatusModal status={txResult.status} message={txResult.message} onClose={handleCloseModal} />}
              
              <div className="form-group"><label htmlFor="name">Nome del Lotto</label><input type="text" id="name" name="name" value={formData.name} onChange={handleInputChange} placeholder="Es. Pomodori San Marzano Bio" /></div>
              <div className="form-group"><label htmlFor="description">Descrizione</label><textarea id="description" name="description" value={formData.description} onChange={handleInputChange} placeholder="Breve descrizione del prodotto e del lotto" /></div>
              <div className="form-group"><label htmlFor="location">Luogo di Origine</label><input type="text" id="location" name="location" value={formData.location} onChange={handleInputChange} placeholder="Es. Agro Sarnese-Nocerino, SA" /></div>
              <div className="form-group"><label htmlFor="date">Data di Raccolta/Produzione</label><input type="date" id="date" name="date" value={formData.date} onChange={handleInputChange} /></div>
              <div className="form-group"><label htmlFor="image">Immagine (Opzionale)</label><input type="file" id="image" name="image" ref={fileInputRef} onChange={handleFileChange} accept="image/*" /></div>
            </div>
            <div className="modal-footer" style={{ justifyContent: "flex-end", gap: '1rem' }}>
                <button onClick={handleCloseModal} className="web3-button secondary" disabled={isProcessing}>Annulla</button>
                <button onClick={handleInitializeBatch} disabled={isProcessing || isTxPending} className="web3-button">{isProcessing || isTxPending ? "In elaborazione..." : "Conferma e Registra"}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AziendaPage;
