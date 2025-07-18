import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
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
    readContract,
    getContractEvents,
} from "thirdweb";
import { polygon } from "thirdweb/chains";
import { inAppWallet } from "thirdweb/wallets";
import { supplyChainABI as abi } from "../abi/contractABI";
import "../App.css";

import TransactionStatusModal from "../components/TransactionStatusModal";

// --- Stili CSS Incorporati (COMPLETI) ---
const AziendaPageStyles = () => (
    <style>{` 
        /* Stili aggiunti per la riga degli step */
        .steps-row { background-color: #2c3e50; }
        .steps-container { padding: 1rem 1.5rem; }
        .steps-container h4 { margin-top: 0; border-bottom: 1px solid #495057; padding-bottom: 0.5rem; }
        .step-item { border-top: 1px solid #495057; padding: 0.75rem 0; }
        .step-item:first-child { border-top: none; }
        .step-item p { margin: 0.25rem 0; font-size: 0.9rem; }
        .web3-button.small { padding: 0.5rem 1rem; font-size: 0.8rem; }
        
        .app-container-full { padding: 0 2rem; } 
        .main-header-bar { display: flex; justify-content: space-between; align-items: center; } 
        .header-title { font-size: 1.75rem; font-weight: bold; } 
        .dashboard-header-card { display: flex; justify-content: space-between; align-items: center; position: relative; padding: 1.5rem; background-color: #212529; border: 1px solid #495057; border-radius: 8px; margin-bottom: 2rem; } 
        .dashboard-header-info { display: flex; flex-direction: column; } 
        .company-name-header { margin-top: 0; margin-bottom: 1rem; font-size: 3rem; } 
        .company-status-container { display: flex; align-items: center; gap: 1.5rem; } 
        .status-item { display: flex; align-items: center; gap: 0.5rem; } 
        .header-actions { display: flex; flex-wrap: wrap; gap: 1rem; align-items: center; }
        .header-actions .web3-button.large { padding: 1rem 2rem; font-size: 1.1rem; } 
        .company-table .desktop-row { display: table-row; } 
        .company-table .mobile-card { display: none; } 
        .pagination-controls { display: flex; justify-content: space-between; align-items: center; margin-top: 1rem; } 
        .recap-summary { text-align: left; padding: 15px; background-color: #2a2a2a; border: 1px solid #444; border-radius: 8px; margin-bottom: 20px;} 
        .recap-summary p { margin: 8px 0; word-break: break-word; } 
        .recap-summary p strong { color: #f8f9fa; } 
        @media (max-width: 1200px) {
         .dashboard-header-card { flex-direction: column; align-items: flex-start; gap: 1.5rem; }
        }
        @media (max-width: 768px) { 
          .app-container-full { padding: 0 1rem; } 
          .main-header-bar { flex-direction: column; align-items: flex-start; gap: 1rem; } 
          .header-title { font-size: 1.5rem; } 
          .wallet-button-container { align-self: flex-start; } 
          .company-name-header { font-size: 2.2rem; } 
          .company-status-container { flex-direction: column; align-items: flex-start; gap: 0.75rem; } 
          .header-actions { width: 100%; flex-direction: column; } 
          .header-actions .web3-button { width: 100%; }
          .header-actions .web3-button.large { width: 100%; font-size: 1rem; } 
          .company-table thead { display: none; } 
          .company-table .desktop-row { display: none; } 
          .company-table tbody, .company-table tr, .company-table td { display: block; width: 100%; } 
          .company-table tr { margin-bottom: 1rem; } 
          .company-table td[colspan="7"] { padding: 20px; text-align: center; border: 1px solid #495057; border-radius: 8px; } 
          .mobile-card { display: block; border: 1px solid #495057; border-radius: 8px; padding: 1rem; margin-bottom: 1rem; background-color: #2c3e50; } 
          .mobile-card .card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; border-bottom: 1px solid #495057; padding-bottom: 0.75rem; } 
          .mobile-card .card-header strong { font-size: 1.1rem; } 
          .mobile-card .card-body p { margin: 0.5rem 0; } 
          .mobile-card .card-body p strong { color: #bdc3c7; } 
          .mobile-card .card-footer { margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #495057; } 
          .mobile-card .web3-button { width: 100%; text-align: center; } 
          .pagination-controls { flex-direction: column; gap: 1rem; } 
        } 
     `}</style>
);

// --- Configurazione del Contratto e del Client ---
const CLIENT_ID = "023dd6504a82409b2bc7cb971fd35b16";
const CONTRACT_ADDRESS = "0x0c5e6204e80e6fb3c0c7098c4fa84b2210358d0b";

const client = createThirdwebClient({ clientId: CLIENT_ID });
const contract = getContract({ client, chain: polygon, address: CONTRACT_ADDRESS, abi });

// --- Componenti UI Interni ---

const RegistrationForm = () => (
    <div className="card">
        <h3>Benvenuto su Easy Chain!</h3>
        <p>Il tuo account non è ancora attivo. Compila il form di registrazione per inviare una richiesta di attivazione.</p>
    </div>
);

const BatchRow = ({ batch, localId, onShowDescription, onToggleSteps, isExpanded, steps, isLoadingSteps }) => {
    const { data: stepCount } = useReadContract({
        contract,
        method: "getBatchStepCount",
        params: [batch.batchId],
    });

    const formatDate = (dateStr) => !dateStr || dateStr.split("-").length !== 3 ? "/" : dateStr.split("-").reverse().join("/");

    return (
        <>
            <tr className="desktop-row">
                <td>{localId}</td>
                <td><span className="clickable-name" onClick={() => onShowDescription(batch)}>{batch.name || "/"}</span></td>
                <td>{formatDate(batch.date)}</td>
                <td>{batch.location || "/"}</td>
                <td>{stepCount !== undefined ? stepCount.toString() : "/"}</td>
                <td>{batch.isClosed ? <span className="status-closed">✅ Chiuso</span> : <span className="status-open">⏳ Aperto</span>}</td>
                <td>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <button className="web3-button small" onClick={() => onToggleSteps(batch.batchId)}>{isExpanded ? 'Nascondi' : 'Step'}</button>
                        <Link to={`/gestisci/${batch.batchId}`} className="web3-button small">Gestisci</Link>
                    </div>
                </td>
            </tr>
            {isExpanded && (
                <tr className="steps-row">
                    <td colSpan={7}>
                        <div className="steps-container">
                            <h4>Step del Lotto #{batch.batchId.toString()}</h4>
                            {isLoadingSteps && <p>Caricamento step...</p>}
                            {!isLoadingSteps && steps.length === 0 && <p>Nessuno step trovato per questo lotto.</p>}
                            {!isLoadingSteps && steps.length > 0 && steps.map(step => (
                                <div key={step.stepIndex.toString()} className="step-item">
                                    <p><strong>Evento:</strong> {step.eventName} (Indice: {step.stepIndex.toString()})</p>
                                    <p><strong>Descrizione:</strong> {step.description || "N/D"}</p>
                                    <p><strong>Data:</strong> {formatDate(step.date)} | <strong>Luogo:</strong> {step.location || "N/D"}</p>
                                </div>
                            ))}
                        </div>
                    </td>
                </tr>
            )}
            <tr className="mobile-card">
                <td>
                    <div className="card-header">
                        <strong className="clickable-name" onClick={() => onShowDescription(batch)}>{batch.name || "N/A"}</strong>
                        <span className={`status ${batch.isClosed ? "status-closed" : "status-open"}`}>{batch.isClosed ? "✅ Chiuso" : "⏳ Aperto"}</span>
                    </div>
                    <div className="card-body">
                        <p><strong>ID:</strong> {localId}</p>
                        <p><strong>Data:</strong> {formatDate(batch.date)}</p>
                        <p><strong>Luogo:</strong> {batch.location || "/"}</p>
                        <p><strong>N° Passaggi:</strong> {stepCount !== undefined ? stepCount.toString() : "/"}</p>
                    </div>
                    <div className="card-footer" style={{ display: 'flex', gap: '10px' }}>
                        <button className="web3-button small" onClick={() => alert("Visualizzazione step non disponibile in questa vista. Usa la versione desktop.")}>Mostra Step</button>
                        <Link to={`/gestisci/${batch.batchId}`} className="web3-button small">Gestisci</Link>
                    </div>
                </td>
            </tr>
        </>
    );
};

interface BatchData { id: string; batchId: bigint; name: string; description: string; date: string; location: string; isClosed: boolean; }
interface StepData { stepIndex: bigint; eventName: string; description: string; date: string; location: string; }

const BatchTable = ({ batches, nameFilter, setNameFilter, locationFilter, setLocationFilter, statusFilter, setStatusFilter, onShowDescription }) => {
    const [expandedBatchId, setExpandedBatchId] = useState(null);
    const [batchSteps, setBatchSteps] = useState({});
    const [isLoadingSteps, setIsLoadingSteps] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsToShow, setItemsToShow] = useState(10);
    const MAX_PER_PAGE = 30;

    const fetchStepsForBatch = useCallback(async (batchId) => {
        setIsLoadingSteps(true);
        try {
            const events = await getContractEvents({ contract, eventName: "BatchStepAdded", filters: { batchId: batchId } });
            const formattedSteps = events.map(event => ({
                stepIndex: event.args.stepIndex,
                eventName: event.args.eventName,
                description: event.args.description,
                date: event.args.date,
                location: event.args.location,
            })).sort((a, b) => Number(a.stepIndex) - Number(b.stepIndex));
            setBatchSteps(prev => ({ ...prev, [batchId.toString()]: formattedSteps }));
        } catch (error) {
            console.error(`Errore nel caricare gli step per il lotto ${batchId}:`, error);
            setBatchSteps(prev => ({ ...prev, [batchId.toString()]: [] }));
        } finally {
            setIsLoadingSteps(false);
        }
    }, []);

    const handleToggleSteps = (batchId) => {
        const batchIdStr = batchId.toString();
        const newExpandedBatchId = expandedBatchId === batchIdStr ? null : batchIdStr;
        setExpandedBatchId(newExpandedBatchId);
        if (newExpandedBatchId && !batchSteps[newExpandedBatchId]) {
            fetchStepsForBatch(batchId);
        }
    };

    useEffect(() => { setCurrentPage(1); setItemsToShow(10); }, [batches, nameFilter, locationFilter, statusFilter]);

    const totalPages = Math.max(1, Math.ceil(batches.length / MAX_PER_PAGE));
    const startIndex = (currentPage - 1) * MAX_PER_PAGE;
    const itemsOnCurrentPage = batches.slice(startIndex, startIndex + MAX_PER_PAGE);
    const visibleBatches = itemsOnCurrentPage.slice(0, itemsToShow);
    const handleLoadMore = () => setItemsToShow(prev => Math.min(prev + 10, MAX_PER_PAGE));
    const handlePageChange = (page) => { if (page < 1 || page > totalPages) return; setCurrentPage(page); setItemsToShow(10); setExpandedBatchId(null); };

    return (
        <div className="table-container">
            <table className="company-table">
                <thead>
                    <tr className="desktop-row">
                        <th>ID</th><th>Nome</th><th>Data</th><th>Luogo</th><th>N° Passaggi</th><th>Stato</th><th>Azione</th>
                    </tr>
                    <tr className="filter-row">
                        <th></th>
                        <th><input type="text" placeholder="Filtra per nome..." className="filter-input" value={nameFilter} onChange={(e) => setNameFilter(e.target.value)} /></th>
                        <th></th>
                        <th><input type="text" placeholder="Filtra per luogo..." className="filter-input" value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)} /></th>
                        <th></th>
                        <th>
                            <select className="filter-input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                                <option value="all">Tutti</option><option value="open">Aperto</option><option value="closed">Chiuso</option>
                            </select>
                        </th>
                        <th></th>
                    </tr>
                </thead>
                <tbody>
                    {visibleBatches.length > 0 ? (
                        visibleBatches.map((batch, index) => (
                            <BatchRow
                                key={batch.id}
                                batch={batch}
                                localId={startIndex + index + 1}
                                onShowDescription={onShowDescription}
                                onToggleSteps={handleToggleSteps}
                                isExpanded={expandedBatchId === batch.batchId.toString()}
                                steps={batchSteps[batch.batchId.toString()] || []}
                                isLoadingSteps={isLoadingSteps && expandedBatchId === batch.batchId.toString()}
                            />
                        ))
                    ) : (
                        <tr><td colSpan={7} style={{ textAlign: "center", padding: "2rem" }}>Nessuna iscrizione trovata. Clicca su uno dei pulsanti di caricamento.</td></tr>
                    )}
                </tbody>
            </table>
            <div className="pagination-controls">
                {itemsToShow < itemsOnCurrentPage.length && (<button onClick={handleLoadMore} className="link-button">Vedi altri 10...</button>)}
                <div className="page-selector">
                    {totalPages > 1 && (
                        <>
                            <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1}>&lt;</button>
                            <span> Pagina {currentPage} di {totalPages} </span>
                            <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages}>&gt;</button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

const DashboardHeader = ({ contributorInfo, onNewInscriptionClick, onFetchInsight, onFetchRpc, onClear, isLoading }) => {
    const companyName = contributorInfo[0] || "Azienda";
    const credits = contributorInfo[1].toString();
    return (
        <div className="dashboard-header-card">
            <div className="dashboard-header-info">
                <h2 className="company-name-header">{companyName}</h2>
                <div className="company-status-container">
                    <div className="status-item"><span>Crediti Rimanenti: <strong>{credits}</strong></span></div>
                    <div className="status-item"><span>Stato: <strong>ATTIVO</strong></span><span className="status-icon">✅</span></div>
                </div>
            </div>
            <div className="header-actions">
                <button className="web3-button large" onClick={onNewInscriptionClick} disabled={isLoading}>Nuova Iscrizione</button>
                <button className="web3-button" onClick={onFetchInsight} disabled={isLoading}>Carica (Insight)</button>
                <button className="web3-button" onClick={onFetchRpc} disabled={isLoading}>Carica (RPC)</button>
                <button className="web3-button secondary" onClick={onClear} disabled={isLoading}>Pulisci Lista</button>
            </div>
        </div>
    );
};

const getInitialFormData = () => ({ name: "", description: "", date: "", location: "" });
const truncateText = (text, maxLength) => !text ? text : (text.length > maxLength ? text.substring(0, maxLength) + "..." : text);

// --- Componente Principale ---
export default function AziendaPage() {
    const account = useActiveAccount();
    const { data: contributorData, isLoading: isStatusLoading, refetch: refetchContributorInfo, isError } = useReadContract({
        contract,
        method: "getContributorInfo",
        params: account ? [account.address] : undefined,
        queryOptions: { enabled: !!account, refetchOnWindowFocus: false },
    });
    
    const prevAccountRef = useRef(account?.address);
    const { mutate: sendTransaction, isPending } = useSendTransaction();
    
    const [modal, setModal] = useState(null);
    const [formData, setFormData] = useState(getInitialFormData());
    const [selectedFile, setSelectedFile] = useState(null);
    const [txResult, setTxResult] = useState(null);
    const [allBatches, setAllBatches] = useState([]);
    const [filteredBatches, setFilteredBatches] = useState([]);
    const [loadingMethod, setLoadingMethod] = useState(null);
    const [descriptionModalBatch, setDescriptionModalBatch] = useState(null);
    const [nameFilter, setNameFilter] = useState("");
    const [locationFilter, setLocationFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [loadingMessage, setLoadingMessage] = useState("");
    const [currentStep, setCurrentStep] = useState(1);

    const fetchBatchesViaInsight = useCallback(async () => {
        if (!account?.address) return;
        setLoadingMethod('insight');
        setAllBatches([]);
        try {
            const events = await getContractEvents({ contract, eventName: "BatchInitialized", filters: { contributor: account.address } });
            const formattedBatches = events.map(event => ({
                id: event.transactionHash + event.logIndex,
                batchId: event.args.batchId,
                name: event.args.name,
                description: event.args.description,
                date: event.args.date,
                location: event.args.location,
                isClosed: event.args.isClosed,
            }));
            setAllBatches(formattedBatches.sort((a, b) => Number(b.batchId) - Number(a.batchId)));
        } catch (error) { console.error("Errore nel caricare i lotti da Insight:", error); setAllBatches([]); } 
        finally { setLoadingMethod(null); }
    }, [account?.address]);
    
    const fetchBatchesViaRpc = useCallback(async () => {
        if (!account?.address) return;
        setLoadingMethod('rpc');
        setAllBatches([]);
        try {
            const batchIds = await readContract({ contract, method: "getBatchesByContributor", params: [account.address] });
            if (batchIds.length === 0) { setAllBatches([]); setLoadingMethod(null); return; }
            
            const batchDetailsPromises = batchIds.map(id => readContract({ contract, method: "getBatchInfo", params: [id] }));
            const batchesInfo = await Promise.all(batchDetailsPromises);
            
            const formattedBatches = batchesInfo
                .filter(batch => Array.isArray(batch) && batch.length > 0) 
                .map((batchInfo) => {
                    const [id, contributor, contributorName, name, description, date, location, imageIpfsHash, isClosed] = batchInfo;
                    return { id: id.toString(), batchId: id, name, description, date, location, isClosed };
                });
            setAllBatches(formattedBatches.sort((a, b) => Number(b.batchId) - Number(a.batchId)));
        } catch (error) { console.error("Errore nel caricare i lotti via RPC:", error); setAllBatches([]); } 
        finally { setLoadingMethod(null); }
    }, [account?.address]);

    const handleClearBatches = () => { setAllBatches([]); setFilteredBatches([]); };
    
    useEffect(() => { if (account?.address && prevAccountRef.current !== account.address) { refetchContributorInfo(); handleClearBatches(); } prevAccountRef.current = account?.address; }, [account?.address, refetchContributorInfo]);
    useEffect(() => { let tempBatches = [...allBatches]; if (nameFilter) tempBatches = tempBatches.filter((b) => b.name.toLowerCase().includes(nameFilter.toLowerCase())); if (locationFilter) tempBatches = tempBatches.filter((b) => b.location.toLowerCase().includes(locationFilter.toLowerCase())); if (statusFilter !== "all") { const isOpen = statusFilter === "open"; tempBatches = tempBatches.filter((b) => !b.isClosed === isOpen); } setFilteredBatches(tempBatches); }, [nameFilter, locationFilter, statusFilter, allBatches]);

    const handleModalInputChange = (e) => setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    const handleFileChange = (e) => setSelectedFile(e.target.files?.[0] || null);
    
    const handleInitializeBatch = async () => {
        if (!formData.name.trim()) {
            setTxResult({ status: "error", message: "Il campo Nome è obbligatorio." });
            return;
        }
        setLoadingMessage("Preparazione transazione...");
        let imageIpfsHash = "N/A";
        // La logica di upload IPFS era commentata, quindi la lasciamo come placeholder.
        // Se necessario, qui andrebbe inserita la chiamata per l'upload del `selectedFile`.
        
        setLoadingMessage("Transazione in corso...");
        const transaction = prepareContractCall({
            contract,
            method: "initializeBatch",
            params: [formData.name, formData.description, formData.date, formData.location, imageIpfsHash],
        });
        sendTransaction(transaction, {
            onSuccess: async () => {
                setTxResult({ status: "success", message: "Iscrizione creata con successo! Ricarica la lista per vederla." });
                setLoadingMessage("");
            },
            onError: (err) => {
                console.error("ERRORE DETTAGLIATO TRANSAZIONE:", err);
                setTxResult({
                    status: "error",
                    message: err.message.toLowerCase().includes("insufficient funds")
                        ? "Crediti Insufficienti, Ricarica"
                        : `Errore nella transazione. Controlla la console per i dettagli.`,
                });
                setLoadingMessage("");
            },
        });
    };

    const openModal = () => { setFormData(getInitialFormData()); setSelectedFile(null); setCurrentStep(1); setTxResult(null); setModal("init"); };
    const handleCloseModal = () => setModal(null);
    const handleNextStep = () => { if (currentStep === 1 && !formData.name.trim()) { alert("Il campo 'Nome Iscrizione' è obbligatorio."); return; } if (currentStep < 6) setCurrentStep(prev => prev + 1); };
    const handlePrevStep = () => { if (currentStep > 1) setCurrentStep(prev => prev - 1); };

    if (!account) { return (<div className="login-container"><AziendaPageStyles /><ConnectButton client={client} chain={polygon} accountAbstraction={{ chain: polygon, sponsorGas: true }} wallets={[inAppWallet()]} connectButton={{ label: "Connettiti / Log In", style: { fontSize: "1.2rem", padding: "1rem 2rem" } }} /></div>); }
    
    const renderDashboardContent = () => {
        if (isStatusLoading) return <p style={{ textAlign: "center", marginTop: "4rem" }}>Verifica stato account...</p>;
        if (isError || !contributorData) return <p style={{ textAlign: "center", marginTop: "4rem", color: "red" }}>Errore nel recuperare i dati dell'account. Riprova.</p>;
        if (!contributorData[2]) return <RegistrationForm />;
        
        return (
            <>
                <DashboardHeader contributorInfo={contributorData} onNewInscriptionClick={openModal} onFetchInsight={fetchBatchesViaInsight} onFetchRpc={fetchBatchesViaRpc} onClear={handleClearBatches} isLoading={!!loadingMethod} />
                {loadingMethod ? <p style={{ textAlign: "center", marginTop: "2rem" }}>Caricamento iscrizioni via {loadingMethod.toUpperCase()}...</p> : <BatchTable batches={filteredBatches} nameFilter={nameFilter} setNameFilter={setNameFilter} locationFilter={locationFilter} setLocationFilter={setLocationFilter} statusFilter={statusFilter} setStatusFilter={setStatusFilter} onShowDescription={setDescriptionModalBatch} />}
            </>
        );
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
            <main className="main-content-full">{renderDashboardContent()}</main>

            {descriptionModalBatch && (
                <div className="modal-overlay" onClick={() => setDescriptionModalBatch(null)}>
                    <div className="modal-content description-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header"><h2>Descrizione Iscrizione / Lotto</h2></div>
                        <div className="modal-body"><p>{descriptionModalBatch.description || "Nessuna descrizione fornita."}</p></div>
                        <div className="modal-footer"><button onClick={() => setDescriptionModalBatch(null)} className="web3-button">Chiudi</button></div>
                    </div>
                </div>
            )}
            
            {modal === "init" && (
                <div className="modal-overlay" onClick={handleCloseModal}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header"><h2>Nuova Iscrizione ({currentStep}/6)</h2></div>
                        <div className="modal-body" style={{ minHeight: "350px" }}>
                            {currentStep === 1 && (
                                <div>
                                    <div className="form-group">
                                        <label>Nome Iscrizione <span style={{ color: "red", fontWeight: "bold" }}>* Obbligatorio</span></label>
                                        <input type="text" name="name" value={formData.name} onChange={handleModalInputChange} className="form-input" maxLength={100} />
                                        <small className="char-counter">{formData.name.length} / 100</small>
                                    </div>
                                    <div style={helpTextStyle}>
                                        <p><strong>ℹ️ Come scegliere il Nome Iscrizione</strong></p>
                                        <p>Il Nome Iscrizione è un'etichetta descrittiva che ti aiuta a identificare in modo chiaro ciò che stai registrando on-chain. Ad esempio:</p>
                                        <ul style={{ textAlign: "left", paddingLeft: "20px" }}>
                                            <li>Il nome di un prodotto o varietà: <em>Pomodori San Marzano 2025</em></li>
                                            <li>Il numero di lotto: <em>Lotto LT1025 – Olio EVO 3L</em></li>
                                            <li>Il nome di un contratto: <em>Contratto fornitura COOP – Aprile 2025</em></li>
                                            <li>Una certificazione o audit: <em>Certificazione Bio ICEA 2025</em></li>
                                            <li>Un riferimento amministrativo: <em>Ordine n.778 – Cliente NordItalia</em></li>
                                        </ul>
                                        <p style={{ marginTop: "1rem" }}><strong>📌 Consiglio:</strong> scegli un nome breve ma significativo, che ti aiuti a ritrovare facilmente l’iscrizione anche dopo mesi o anni.</p>
                                    </div>
                                </div>
                            )}
                            {currentStep === 2 && (
                                <div>
                                    <div className="form-group">
                                        <label>Descrizione <span style={{ color: "#6c757d" }}>Non obbligatorio</span></label>
                                        <textarea name="description" value={formData.description} onChange={handleModalInputChange} className="form-input" rows={4} maxLength={500}></textarea>
                                        <small className="char-counter">{formData.description.length} / 500</small>
                                    </div>
                                    <div style={helpTextStyle}><p>Inserisci una descrizione del prodotto, lotto, contratto o altro elemento principale. Fornisci tutte le informazioni essenziali per identificarlo chiaramente.</p></div>
                                </div>
                            )}
                            {currentStep === 3 && (
                                <div>
                                    <div className="form-group">
                                        <label>Luogo <span style={{ color: "#6c757d" }}>Non obbligatorio</span></label>
                                        <input type="text" name="location" value={formData.location} onChange={handleModalInputChange} className="form-input" maxLength={100} />
                                        <small className="char-counter">{formData.location.length} / 100</small>
                                    </div>
                                    <div style={helpTextStyle}><p>Inserisci il luogo di origine o di produzione del prodotto o lotto. Può essere una città, una regione, un'azienda agricola o uno stabilimento specifico.</p></div>
                                </div>
                            )}
                            {currentStep === 4 && (
                                <div>
                                    <div className="form-group">
                                        <label>Data <span style={{ color: "#6c757d" }}>Non obbligatorio</span></label>
                                        <input type="date" name="date" value={formData.date} onChange={handleModalInputChange} className="form-input" max={today} />
                                    </div>
                                    <div style={helpTextStyle}><p>Inserisci una data, puoi utilizzare il giorno attuale o una data precedente alla conferma di questa Iscrizione.</p></div>
                                </div>
                            )}
                            {currentStep === 5 && (
                                <div>
                                    <div className="form-group">
                                        <label>Immagine <span style={{ color: "#6c757d" }}>Non obbligatorio</span></label>
                                        <input type="file" name="image" onChange={handleFileChange} className="form-input" accept="image/png, image/jpeg, image/webp" />
                                        <small style={{ marginTop: "4px" }}>Formati: PNG, JPG, WEBP. Max: 5 MB.</small>
                                        {selectedFile && <p className="file-name-preview">File: {selectedFile.name}</p>}
                                    </div>
                                    <div style={helpTextStyle}>
                                        <p>Carica un’immagine rappresentativa del prodotto, lotto, contratto, etc. Rispetta i formati e i limiti di peso.</p>
                                        <p style={{ marginTop: "10px" }}><strong>Consiglio:</strong> Per una visualizzazione ottimale, usa un'immagine quadrata (formato 1:1).</p>
                                    </div>
                                </div>
                            )}
                            {currentStep === 6 && (
                                <div>
                                    <h4>Riepilogo Dati</h4>
                                    <div className="recap-summary">
                                        <p><strong>Nome:</strong> {truncateText(formData.name, 40) || "Non specificato"}</p>
                                        <p><strong>Descrizione:</strong> {truncateText(formData.description, 60) || "Non specificata"}</p>
                                        <p><strong>Luogo:</strong> {truncateText(formData.location, 40) || "Non specificato"}</p>
                                        <p><strong>Data:</strong> {formData.date ? formData.date.split("-").reverse().join("/") : "Non specificata"}</p>
                                        <p><strong>Immagine:</strong> {truncateText(selectedFile?.name, 40) || "Nessuna"}</p>
                                    </div>
                                    <p>Vuoi confermare e registrare questi dati sulla blockchain?</p>
                                </div>
                            )}
                        </div>
                        <div className="modal-footer" style={{ justifyContent: "space-between" }}>
                            <div>
                                {currentStep > 1 && <button onClick={handlePrevStep} className="web3-button secondary" disabled={isProcessing}>Indietro</button>}
                            </div>
                            <div>
                                <button onClick={handleCloseModal} className="web3-button secondary" disabled={isProcessing}>Chiudi</button>
                                {currentStep < 6 && <button onClick={handleNextStep} className="web3-button">Avanti</button>}
                                {currentStep === 6 && <button onClick={handleInitializeBatch} disabled={isProcessing} className="web3-button">{isProcessing ? "Conferma..." : "Conferma e Registra"}</button>}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {isProcessing && <TransactionStatusModal status={"loading"} message={loadingMessage} onClose={() => {}} />}
            {txResult && <TransactionStatusModal status={txResult.status} message={txResult.message} onClose={() => { if (txResult.status === "success") handleCloseModal(); setTxResult(null); }} />}
        </div>
    );
}
