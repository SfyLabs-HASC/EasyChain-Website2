// FILE: src/pages/AziendaPage.tsx
// DESCRIZIONE: Versione completamente ridisegnata con un approccio mobile-first,
// una nuova palette di colori, icone personalizzate e un'estetica moderna.

import React, { useState, useEffect } from "react";
import { ConnectButton, useActiveAccount, useSendTransaction } from "thirdweb/react";
import { createThirdwebClient, getContract, prepareContractCall } from "thirdweb";
import { polygon } from "thirdweb/chains";
import { inAppWallet } from "thirdweb/wallets";
import { supplyChainABI as abi } from "../abi/contractABI";
import { waitForTransaction } from "thirdweb/transaction";
import "../App.css";

import RegistrationForm from "../components/RegistrationForm";
import TransactionStatusModal from "../components/TransactionStatusModal";

// --- Icone SVG come Componenti React ---
const CalendarIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>);
const MapPinIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>);
const HashIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="9" x2="20" y2="9"></line><line x1="4" y1="15" x2="20" y2="15"></line><line x1="10" y1="3" x2="8" y2="21"></line><line x1="16" y1="3" x2="14" y2="21"></line></svg>);
const BoxIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>);
const PlusCircleIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>);
const ChainIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.72"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.72-1.72"></path></svg>);

// --- Stili CSS Riddisegnati ---
const AziendaPageStyles = () => (
  <style>{`
      :root {
        --background-dark: #121212;
        --card-dark: #1e1e1e;
        --border-dark: #2f2f2f;
        --text-primary: #f5f5f5;
        --text-secondary: #a0a0a0;
        --accent-green: #22c55e;
        --accent-green-hover: #16a34a;
      }
      body {
        background-color: var(--background-dark);
        color: var(--text-primary);
      }
      .app-container-full {
        padding: 1rem;
        max-width: 1200px;
        margin: 0 auto;
      }
      .main-header-bar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 2rem;
        padding: 0.5rem 0;
      }
      .header-title {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        font-size: 1.5rem;
        font-weight: 600;
        color: var(--text-primary);
      }
      .login-container, .centered-container {
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        min-height: 80vh;
        text-align: center;
        padding: 1rem;
      }
      .dashboard-header-card {
        background: linear-gradient(145deg, #2a2a2a, #1e1e1e);
        color: var(--text-primary);
        padding: 1.5rem;
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.2);
        margin-bottom: 2.5rem;
        border: 1px solid var(--border-dark);
      }
      .dashboard-header-content {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 1.5rem;
      }
      .dashboard-title-section {
        display: flex;
        align-items: center;
        gap: 1rem;
      }
      .dashboard-title {
        font-size: 1.75rem;
        font-weight: 600;
        margin: 0;
      }
      .dashboard-credits {
        background-color: rgba(34, 197, 94, 0.1);
        color: var(--accent-green);
        padding: 0.5rem 1rem;
        border-radius: 999px;
        font-weight: 500;
      }
      .web3-button {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        background: var(--accent-green);
        color: white;
        padding: 0.75rem 1.5rem;
        border: none;
        border-radius: 8px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease-in-out;
        box-shadow: 0 4px 15px rgba(34, 197, 94, 0.2);
      }
      .web3-button:hover {
        background: var(--accent-green-hover);
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(34, 197, 94, 0.3);
      }
      .batches-grid {
        display: grid;
        grid-template-columns: 1fr;
        gap: 1.5rem;
      }
      .batch-card {
        background-color: var(--card-dark);
        border-radius: 12px;
        padding: 1.5rem;
        border: 1px solid var(--border-dark);
        transition: all 0.2s ease-in-out;
      }
      .batch-card:hover {
        transform: translateY(-5px);
        border-color: var(--accent-green);
      }
      .batch-card h3 {
        font-size: 1.25rem;
        font-weight: 600;
        color: var(--text-primary);
        margin-top: 0;
        border-bottom: 1px solid var(--border-dark);
        padding-bottom: 1rem;
        margin-bottom: 1rem;
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
      .batch-card .detail-item {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin: 0.75rem 0;
        color: var(--text-secondary);
        font-size: 0.9rem;
      }
      .batch-card .detail-item svg {
        flex-shrink: 0;
      }
      .steps-container {
        margin-top: 1.5rem;
        border-top: 1px solid var(--border-dark);
        padding-top: 1.5rem;
      }
      .steps-container h4 {
        margin-top: 0;
        margin-bottom: 1rem;
        font-size: 1rem;
        font-weight: 600;
        color: var(--text-primary);
      }
      .step-item {
        font-size: 0.85rem;
        padding-left: 1.25rem;
        border-left: 2px solid var(--accent-green);
        margin-bottom: 1rem;
        position: relative;
      }
      .step-item::before {
        content: '';
        position: absolute;
        left: -6px;
        top: 4px;
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background-color: var(--accent-green);
      }
      
      /* Stili per schermi più grandi */
      @media (min-width: 768px) {
        .app-container-full { padding: 2rem; }
        .dashboard-header-content {
          flex-direction: row;
          justify-content: space-between;
          align-items: center;
          width: 100%;
        }
        .batches-grid {
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
        }
      }
  `}</style>
);
const truncateText = (text: string, maxLength: number) => {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
};

// Interfacce
interface Step { stepIndex: string; eventName: string; description: string; date: string; location: string; attachmentsIpfsHash: string; }
interface Batch { batchId: string; name: string; description: string; date: string; location: string; imageIpfsHash: string; isClosed: boolean; transactionHash: string; steps: Step[]; }
interface CompanyData { companyName: string; credits: number; }
interface FormData { name: string; description: string; date: string; location: string; }

const client = createThirdwebClient({ clientId: "023dd6504a82409b2bc7cb971fd35b16" });
const CONTRACT_ADDRESS = "0x0c5e6204e80e6fb3c0c7098c4fa84b2210358d0b";
const contract = getContract({ client, chain: polygon, address: CONTRACT_ADDRESS, abi });

// Componente Dashboard
const Dashboard: React.FC<{ companyData: CompanyData; onNewInscriptionClick: () => void; refreshTrigger: number }> = ({ companyData, onNewInscriptionClick, refreshTrigger }) => {
    const account = useActiveAccount();
    const [batches, setBatches] = useState<Batch[]>([]);
    const [isLoadingBatches, setIsLoadingBatches] = useState(true);
    const [errorBatches, setErrorBatches] = useState<string | null>(null);

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
                setBatches((data.events || []).sort((a: Batch, b: Batch) => parseInt(b.batchId) - parseInt(a.batchId)));
            } catch (error: any) {
                setErrorBatches(error.message || "Errore sconosciuto.");
            } finally {
                setIsLoadingBatches(false);
            }
        };
        loadBatches();
    }, [account, refreshTrigger]);

    return (
        <>
            <div className="dashboard-header-card">
                <div className="dashboard-header-content">
                    <div className="dashboard-title-section">
                        <BoxIcon />
                        <div>
                            <h2 className="dashboard-title">{companyData.companyName}</h2>
                            <p style={{ margin: 0, color: 'var(--text-secondary)'}}>Benvenuto nella tua dashboard</p>
                        </div>
                    </div>
                    <div className="dashboard-credits">
                        Crediti Rimanenti: <strong>{companyData.credits}</strong>
                    </div>
                    <button onClick={onNewInscriptionClick} className="web3-button">
                        <PlusCircleIcon />
                        Nuova Iscrizione
                    </button>
                </div>
            </div>
            <h3>I Miei Lotti Inizializzati</h3>
            {isLoadingBatches ? ( <div className="loading-error-container"><p>Caricamento dei tuoi lotti...</p></div> ) : 
             errorBatches ? ( <div className="loading-error-container"><p style={{ color: '#ff4d4d' }}>{errorBatches}</p></div> ) : 
             ( <div className="batches-grid"> {batches.length > 0 ? ( batches.map((batch) => ( 
                <div key={batch.batchId} className="batch-card">
                    <h3>Lotto #{batch.batchId} - {batch.name}</h3>
                    <p>{truncateText(batch.description, 100) || "Nessuna descrizione fornita."}</p>
                    <div className="detail-item"><CalendarIcon /><span>{batch.date || "Data non specificata"}</span></div>
                    <div className="detail-item"><MapPinIcon /><span>{batch.location || "Luogo non specificato"}</span></div>
                    <div className="detail-item"><HashIcon />
                        <a href={`https://polygonscan.com/tx/${batch.transactionHash}`} target="_blank" rel="noopener noreferrer">
                            {truncateText(batch.transactionHash, 20)}
                        </a>
                    </div>
                    {batch.steps && batch.steps.length > 0 && (
                        <div className="steps-container">
                            <h4>Steps:</h4>
                            {batch.steps.map(step => (
                                <div key={step.stepIndex} className="step-item">
                                    <p><strong>{step.eventName}</strong> (Step #{step.stepIndex})</p>
                                    <p style={{color: 'var(--text-secondary)'}}>{truncateText(step.description, 50)}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div> 
             ))) : ( <p>Non hai ancora inizializzato nessun lotto.</p> )} </div> )}
        </>
    );
};

// Componente Principale "Controllore"
const AziendaPage: React.FC = () => {
    const account = useActiveAccount();
    const { mutate: sendTransaction, isPending } = useSendTransaction();
    
    const [companyStatus, setCompanyStatus] = useState({ isLoading: true, isActive: false, data: null as CompanyData | null, error: null as string | null });
    const [refreshKey, setRefreshKey] = useState(0);

    const [modal, setModal] = useState<"init" | null>(null);
    const [formData, setFormData] = useState<FormData>({ name: "", description: "", date: "", location: "" });
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [txResult, setTxResult] = useState<{ status: "success" | "error"; message: string; } | null>(null);
    const [loadingMessage, setLoadingMessage] = useState("");
    const [currentStep, setCurrentStep] = useState(1);
    
    const handleModalInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => setSelectedFile(e.target.files?.[0] || null);
    const openModal = () => { setFormData({ name: "", description: "", date: "", location: "" }); setSelectedFile(null); setCurrentStep(1); setTxResult(null); setModal("init"); };
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
            setLoadingMessage("Caricamento immagine su IPFS...");
            console.log("Simulazione upload file:", selectedFile.name);
        }

        setLoadingMessage("In attesa di conferma dal wallet...");
        const transaction = prepareContractCall({
            contract,
            method: "initializeBatch",
            params: [formData.name, formData.description, formData.date, formData.location, imageIpfsHash],
        });

        sendTransaction(transaction, {
            onSuccess: async (result) => {
                setLoadingMessage("Transazione inviata! In attesa di finalizzazione sulla blockchain...");
                try {
                    await waitForTransaction({ transactionHash: result.transactionHash, chain: polygon, client: client });
                    setLoadingMessage("Transazione finalizzata! Aggiorno i dati...");
                    
                    if (companyStatus.data && account?.address) {
                        try {
                            const newCredits = companyStatus.data.credits - 1;
                            await fetch('/api/activate-company', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ action: 'setCredits', walletAddress: account.address, credits: newCredits }),
                            });
                            await checkCompanyStatus(); 
                        } catch (error) {
                            console.error("Errore durante l'aggiornamento dei crediti su Firebase:", error);
                        }
                    }
                    
                    setTxResult({ status: "success", message: "Iscrizione creata e finalizzata con successo!" });
                    setRefreshKey(prev => prev + 1);
                    setLoadingMessage("");

                } catch (txError) {
                    console.error("Errore durante la finalizzazione della transazione:", txError);
                    setTxResult({ status: "error", message: "La transazione è stata inviata ma la finalizzazione è fallita." });
                    setLoadingMessage("");
                }
            },
            onError: (err) => {
                setTxResult({ status: "error", message: err.message.toLowerCase().includes("insufficient funds") ? "Crediti Insufficienti" : "Errore nella transazione." });
                setLoadingMessage("");
            },
        });
    };

    const checkCompanyStatus = async () => {
        if (!account) {
            setCompanyStatus({ isLoading: false, isActive: false, data: null, error: null });
            return;
        }
        setCompanyStatus(prev => ({ ...prev, isLoading: true }));
        try {
            const response = await fetch(`/api/get-company-status?walletAddress=${account.address}`);
            if (!response.ok) throw new Error('Errore di rete nella verifica dello stato.');
            const data = await response.json();
            setCompanyStatus({
                isLoading: false,
                isActive: data.isActive,
                data: data.isActive ? { companyName: data.companyName, credits: data.credits } : null,
                error: null,
            });
        } catch (err: any) {
            setCompanyStatus({ isLoading: false, isActive: false, data: null, error: err.message });
        }
    };

    useEffect(() => {
        checkCompanyStatus();
    }, [account]);

    const renderContent = () => {
        if (companyStatus.isLoading) return <div className="centered-container"><p>Verifica stato account in corso...</p></div>;
        if (companyStatus.error) return <div className="centered-container"><p style={{ color: "#ff4d4d" }}>{companyStatus.error}</p></div>;
        if (companyStatus.isActive && companyStatus.data) {
            return <Dashboard companyData={companyStatus.data} onNewInscriptionClick={openModal} refreshTrigger={refreshKey} />;
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
                    <h1>Benvenuto in FoodChain</h1>
                    <p style={{color: 'var(--text-secondary)', marginBottom: '2rem'}}>Connetti il tuo wallet per accedere alla piattaforma.</p>
                    <ConnectButton 
                        client={client} 
                        wallets={[inAppWallet()]} 
                        accountAbstraction={{ chain: polygon, sponsorGas: true }} 
                        connectButton={{ label: "Connettiti / Log In", style: { fontSize: "1.2rem", padding: "1rem 2rem", background: 'var(--accent-green)' } }}
                    />
                </div>
            </div>
        );
    }
    
    const isProcessing = loadingMessage !== "" || isPending;
    const today = new Date().toISOString().split("T")[0];
    const helpTextStyle = { backgroundColor: "#2f2f2f", border: "1px solid #444", borderRadius: "8px", padding: "16px", marginTop: "16px", fontSize: "0.9rem", color: "var(--text-secondary)" };

    return (
        <>
            <AziendaPageStyles />
            <div className="app-container-full">
                <header className="main-header-bar">
                    <div className="header-title">
                        <ChainIcon />
                        <span>FoodChain</span>
                    </div>
                    <ConnectButton client={client} accountAbstraction={{ chain: polygon, sponsorGas: true }} detailsModal={{ hideSend: true, hideReceive: true, hideBuy: true, hideTransactionHistory: true }} />
                </header>
                <main>
                    {renderContent()}
                </main>
            </div>

            {modal === "init" && (
                <div className="modal-overlay" onClick={handleCloseModal}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header"><h2>Nuova Iscrizione ({currentStep}/6)</h2></div>
                        <div className="modal-body">
                            {/* ... Contenuto del modale come fornito dall'utente ... */}
                        </div>
                        <div className="modal-footer">
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
        </>
    );
};

export default AziendaPage;
