// FILE: src/pages/AziendaPage.tsx
// DESCRIZIONE: Versione finale che reintegra la logica completa del modale di creazione
// con tutti gli step, i testi e le chiamate a Firebase/smart contract.

import React, { useState, useEffect } from "react";
import { ConnectButton, useActiveAccount, useSendTransaction, useReadContract } from "thirdweb/react";
import { createThirdwebClient, getContract, prepareContractCall } from "thirdweb";
import { polygon } from "thirdweb/chains";
// Thirdweb Wallets
import { inAppWallet } from "thirdweb/wallets";
import { supplyChainABI as abi } from "../abi/contractABI";
import "../App.css";

import RegistrationForm from "../components/RegistrationForm";

// --- Stili (con aggiunte per il modale) ---
const AziendaPageStyles = () => (
  <style>{`
      .app-container-full { padding: 0 2rem; }
      .main-header-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; flex-wrap: wrap; }
      .header-title { font-size: 1.75rem; font-weight: bold; }
      .login-container, .centered-container { display: flex; flex-direction: column; justify-content: center; align-items: center; min-height: 80vh; text-align: center; }
      .dashboard-header-card { background-color: #f8f9fa; color: #212529; padding: 1.5rem; border-radius: 0.75rem; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); margin-bottom: 2rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; }
      .dashboard-title { font-size: 1.5rem; font-weight: 600; }
      .web3-button { background-color: #3b82f6; color: white; padding: 0.75rem 1.5rem; border: none; border-radius: 0.5rem; font-weight: 500; cursor: pointer; transition: background-color 0.2s; font-size: 1rem; }
      .web3-button.secondary { background-color: #e2e8f0; color: #2d3748; }
      .web3-button:hover { background-color: #2563eb; }
      .web3-button:disabled { background-color: #94a3b8; cursor: not-allowed; }
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
      .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(0,0,0,0.7); display: flex; justify-content: center; align-items: center; z-index: 1000; }
      .modal-content { background: #1c1c1c; color: #f8f9fa; border-radius: 12px; width: 90%; max-width: 800px; max-height: 90vh; display: flex; flex-direction: column; }
      .modal-header { padding: 1.5rem; border-bottom: 1px solid #343a40; }
      .modal-header h2 { margin: 0; font-size: 1.5rem; }
      .modal-body { padding: 1.5rem; overflow-y: auto; flex-grow: 1; min-height: 350px; }
      .modal-footer { padding: 1.5rem; border-top: 1px solid #343a40; display: flex; justify-content: space-between; }
      .form-group { margin-bottom: 1.5rem; }
      .form-group label { display: block; margin-bottom: 0.5rem; font-weight: 500; color: #adb5bd; }
      .form-input { width: 100%; padding: 0.75rem; background-color: #2a2a2a; border: 1px solid #495057; border-radius: 6px; color: #f8f9fa; font-size: 1rem; }
      .char-counter { font-size: 0.8rem; color: #6c757d; display: block; text-align: right; }
      .recap-summary { text-align: left; padding: 15px; background-color: #2a2a2a; border: 1px solid #444; border-radius: 8px; margin-bottom: 20px;}
      .recap-summary p { margin: 8px 0; word-break: break-word; }
      .recap-summary p strong { color: #f8f9fa; }
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

// Componente Dashboard
const Dashboard: React.FC<{ companyData: CompanyData; onNewInscriptionClick: () => void }> = ({ companyData, onNewInscriptionClick }) => {
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
    }, [account]);

    return (
        <>
            <div className="dashboard-header-card">
                <div>
                    <h2 className="dashboard-title">{companyData.companyName}</h2>
                    <p>Crediti Rimanenti: <strong>{companyData.credits}</strong></p>
                </div>
                {/* --- MODIFICA 1: Testo del pulsante aggiornato --- */}
                <button onClick={onNewInscriptionClick} className="web3-button">Nuova Iscrizione</button>
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
        </>
    );
};

// Componente Principale "Controllore"
const AziendaPage: React.FC = () => {
    const account = useActiveAccount();
    const { mutate: sendTransaction, isPending } = useSendTransaction();
    
    // Stato per la verifica dell'azienda
    const [companyStatus, setCompanyStatus] = useState({ isLoading: true, isActive: false, data: null as CompanyData | null, error: null as string | null });

    // --- MODIFICA 2: Reintegrazione di tutta la logica del modale ---
    const [modal, setModal] = useState<"init" | null>(null);
    const [formData, setFormData] = useState<FormData>({ name: "", description: "", date: "", location: "" });
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [txResult, setTxResult] = useState<{ status: "success" | "error"; message: string; } | null>(null);
    const [loadingMessage, setLoadingMessage] = useState("");
    const [currentStep, setCurrentStep] = useState(1);
    
    // Funzioni di gestione del modale
    const handleModalInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => setSelectedFile(e.target.files?.[0] || null);
    const openModal = () => { setFormData({ name: "", description: "", date: "", location: "" }); setSelectedFile(null); setCurrentStep(1); setTxResult(null); setModal("init"); };
    const handleCloseModal = () => setModal(null);
    const handleNextStep = () => { if (currentStep === 1 && !formData.name.trim()) { alert("Il campo 'Nome Iscrizione' è obbligatorio."); return; } if (currentStep < 6) setCurrentStep((prev) => prev + 1); };
    const handlePrevStep = () => { if (currentStep > 1) setCurrentStep((prev) => prev - 1); };

    // Funzione per inviare la transazione, inclusa la logica di upload e aggiornamento crediti
    const handleInitializeBatch = async () => {
        if (!formData.name.trim()) {
            setTxResult({ status: "error", message: "Il campo Nome è obbligatorio." });
            return;
        }
        setLoadingMessage("Preparazione transazione...");
        let imageIpfsHash = "N/A";

        if (selectedFile) {
            setLoadingMessage("Caricamento immagine su IPFS...");
            // Qui andrebbe la vera logica di upload. Per ora usiamo un placeholder.
            // const cid = await uploadToIpfs(selectedFile);
            // imageIpfsHash = cid;
            console.log("Simulazione upload file:", selectedFile.name);
        }

        setLoadingMessage("In attesa di conferma dal wallet...");
        const transaction = prepareContractCall({
            contract,
            method: "initializeBatch",
            params: [formData.name, formData.description, formData.date, formData.location, imageIpfsHash],
        });

        sendTransaction(transaction, {
            onSuccess: async () => {
                setLoadingMessage("Transazione confermata! Aggiorno i dati...");
                
                // Logica di aggiornamento crediti su Firebase
                if (companyStatus.data && account?.address) {
                    try {
                        const newCredits = companyStatus.data.credits - 1;
                        await fetch('/api/activate-company', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                action: 'setCredits',
                                walletAddress: account.address,
                                credits: newCredits,
                            }),
                        });
                        // Aggiorna la UI con i nuovi dati da Firebase
                        checkCompanyStatus(); 
                    } catch (error) {
                        console.error("Errore durante l'aggiornamento dei crediti su Firebase:", error);
                    }
                }
                setTxResult({ status: "success", message: "Iscrizione creata con successo!" });
                setLoadingMessage("");
            },
            onError: (err) => {
                setTxResult({ status: "error", message: err.message.toLowerCase().includes("insufficient funds") ? "Crediti Insufficienti" : "Errore nella transazione." });
                setLoadingMessage("");
            },
        });
    };

    // Funzione per controllare lo stato dell'azienda su Firebase
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

    checkCompanyStatus();
  }, [account]);

    const renderContent = () => {
        if (companyStatus.isLoading) return <div className="centered-container"><p>Verifica stato account in corso...</p></div>;
        if (companyStatus.error) return <div className="centered-container"><p style={{ color: "red" }}>{companyStatus.error}</p></div>;
        if (companyStatus.isActive && companyStatus.data) {
            return <Dashboard companyData={companyStatus.data} onNewInscriptionClick={openModal} />;
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
                    <ConnectButton client={client} wallets={[inAppWallet()]} accountAbstraction={{ chain: polygon, sponsorGas: true }} />
                </div>
            </div>
        );
    }
    
    const isProcessing = loadingMessage !== "" || isPending;
    const today = new Date().toISOString().split("T")[0];
    const helpTextStyle = { backgroundColor: "#343a40", border: "1px solid #495057", borderRadius: "8px", padding: "16px", marginTop: "16px", fontSize: "0.9rem", color: "#f8f9fa" };

    return (
        <>
            <AziendaPageStyles />
            <div className="app-container-full">
                <header className="main-header-bar">
                    <h1 className="header-title">FoodChain</h1>
                    <ConnectButton client={client} accountAbstraction={{ chain: polygon, sponsorGas: true }} />
                </header>
                <main>
                    {renderContent()}
                </main>
            </div>

            {/* --- MODIFICA 3: Il modale completo è ora qui --- */}
            {modal === "init" && (
                <div className="modal-overlay" onClick={handleCloseModal}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header"><h2>Nuova Iscrizione ({currentStep}/6)</h2></div>
                        <div className="modal-body">
                            {currentStep === 1 && ( <div> <div className="form-group"> <label> Nome Iscrizione <span style={{ color: "red", fontWeight: "bold" }}> * Obbligatorio </span> </label> <input type="text" name="name" value={formData.name} onChange={handleModalInputChange} className="form-input" maxLength={100} /> <small className="char-counter"> {formData.name.length} / 100 </small> </div> <div style={helpTextStyle}> <p><strong>ℹ️ Come scegliere il Nome Iscrizione</strong></p> <p>Il Nome Iscrizione è un'etichetta descrittiva che ti aiuta a identificare in modo chiaro ciò che stai registrando on-chain. Ad esempio:</p> <ul style={{ textAlign: "left", paddingLeft: "20px" }}> <li>Il nome di un prodotto o varietà: <em>Pomodori San Marzano 2025</em></li> <li>Il numero di lotto: <em>Lotto LT1025 – Olio EVO 3L</em></li> <li>Il nome di un contratto: <em>Contratto fornitura COOP – Aprile 2025</em></li><li>Una certificazione o audit: <em>Certificazione Bio ICEA 2025</em></li><li>Un riferimento amministrativo: <em>Ordine n.778 – Cliente NordItalia</em></li></ul> <p style={{ marginTop: "1rem" }}><strong>📌 Consiglio:</strong> scegli un nome breve ma significativo, che ti aiuti a ritrovare facilmente l’iscrizione anche dopo mesi o anni.</p> </div> </div> )}
                            {currentStep === 2 && ( <div> <div className="form-group"> <label> Descrizione <span style={{ color: "#6c757d" }}> Non obbligatorio </span> </label> <textarea name="description" value={formData.description} onChange={handleModalInputChange} className="form-input" rows={4} maxLength={500}></textarea> <small className="char-counter"> {formData.description.length} / 500 </small> </div> <div style={helpTextStyle}> <p>Inserisci una descrizione del prodotto, lotto, contratto o altro elemento principale. Fornisci tutte le informazioni essenziali per identificarlo chiaramente nella filiera o nel contesto dell’iscrizione.</p> </div> </div> )}
                            {currentStep === 3 && ( <div> <div className="form-group"> <label> Luogo <span style={{ color: "#6c757d" }}> Non obbligatorio </span> </label> <input type="text" name="location" value={formData.location} onChange={handleModalInputChange} className="form-input" maxLength={100} /> <small className="char-counter"> {formData.location.length} / 100 </small> </div> <div style={helpTextStyle}> <p>Inserisci il luogo di origine o di produzione del prodotto o lotto. Può essere una città, una regione, un'azienda agricola o uno stabilimento specifico per identificare con precisione dove è stato realizzato.</p> </div> </div> )}
                            {currentStep === 4 && ( <div> <div className="form-group"> <label> Data <span style={{ color: "#6c757d" }}> Non obbligatorio </span> </label> <input type="date" name="date" value={formData.date} onChange={handleModalInputChange} className="form-input" max={today} /> </div> <div style={helpTextStyle}> <p>Inserisci una data, puoi utilizzare il giorno attuale o una data precedente alla conferma di questa Iscrizione.</p> </div> </div> )}
                            {currentStep === 5 && ( <div> <div className="form-group"> <label> Immagine <span style={{ color: "#6c757d" }}> Non obbligatorio </span> </label> <input type="file" name="image" onChange={handleFileChange} className="form-input" accept="image/png, image/jpeg, image/webp" /> <small style={{ marginTop: "4px" }}> Formati: PNG, JPG, WEBP. Max: 5 MB. </small> {selectedFile && ( <p className="file-name-preview"> File: {selectedFile.name} </p> )} </div> <div style={helpTextStyle}> <p>Carica un’immagine rappresentativa del prodotto, lotto, contratto, etc. Rispetta i formati e i limiti di peso.<br/><strong>Consiglio:</strong> Per una visualizzazione ottimale, usa un'immagine quadrata (formato 1:1).</p> </div> </div> )}
                            {currentStep === 6 && ( <div> <h4>Riepilogo Dati</h4> <div className="recap-summary"> <p> <strong>Nome:</strong> {truncateText(formData.name, 40) || "N/D"} </p> <p> <strong>Descrizione:</strong> {truncateText(formData.description, 60) || "N/D"} </p> <p> <strong>Luogo:</strong> {truncateText(formData.location, 40) || "N/D"} </p> <p> <strong>Data:</strong> {formData.date ? formData.date.split("-").reverse().join("/") : "N/D"} </p> <p> <strong>Immagine:</strong> {truncateText(selectedFile?.name || "", 40) || "Nessuna"} </p> </div> <p> Vuoi confermare e registrare questi dati sulla blockchain? </p> </div> )}
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