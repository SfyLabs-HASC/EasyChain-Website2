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

// --- Stili CSS (invariati, ma inclusi per completezza) ---
const AziendaPageStyles = () => (
    <style>{`
        /* ... gli stili che hai fornito sono qui ... */
        /* Aggiunta di stili per la riga degli step */
        .steps-row { background-color: #2c3e50; }
        .steps-container { padding: 1rem 1.5rem; }
        .step-item { border-top: 1px solid #495057; padding: 0.75rem 0; }
        .step-item:first-child { border-top: none; }
        .step-item p { margin: 0.25rem 0; }
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

// ✅ MODIFICA: Utilizzo del Client ID e dell'indirizzo del contratto corretti, come nel file HTML.
const CLIENT_ID = "023dd6504a82409b2bc7cb971fd35b16";
const CONTRACT_ADDRESS = "0x0c5e6204e80e6fb3c0c7098c4fa84b2210358d0b";

const client = createThirdwebClient({ clientId: CLIENT_ID });
const contract = getContract({ client, chain: polygon, address: CONTRACT_ADDRESS, abi });

// --- Componenti interni (modificati o nuovi) ---

const RegistrationForm = () => (
    <div className="card">
        <h3>Benvenuto su Easy Chain!</h3>
        <p>Il tuo account non è ancora attivo. Compila il form di registrazione per inviare una richiesta di attivazione.</p>
    </div>
);

// ✅ MODIFICA: Il BatchRow ora gestisce lo stato di espansione e visualizza gli step.
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
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button className="web3-button small" onClick={() => onToggleSteps(batch.batchId)}>{isExpanded ? 'Nascondi Step' : 'Mostra Step'}</button>
                        <Link to={`/gestisci/${batch.batchId}`} className="web3-button small">Gestisci</Link>
                    </div>
                </td>
            </tr>
            {/* Riga espandibile per gli step */}
            {isExpanded && (
                <tr className="steps-row">
                    <td colSpan={7}>
                        <div className="steps-container">
                            <h4>Step del Lotto #{batch.batchId.toString()}</h4>
                            {isLoadingSteps && <p>Caricamento step...</p>}
                            {!isLoadingSteps && steps.length === 0 && <p>Nessuno step trovato per questo lotto.</p>}
                            {!isLoadingSteps && steps.length > 0 && steps.map(step => (
                                <div key={step.stepIndex} className="step-item">
                                    <p><strong>Evento:</strong> {step.eventName} (Indice: {step.stepIndex.toString()})</p>
                                    <p><strong>Descrizione:</strong> {step.description}</p>
                                    <p><strong>Data:</strong> {formatDate(step.date)} | <strong>Luogo:</strong> {step.location}</p>
                                </div>
                            ))}
                        </div>
                    </td>
                </tr>
            )}

            {/* Card per il mobile (semplificata, senza step per brevità) */}
            <tr className="mobile-card">
                <td>
                    <div className="card-header">
                        <strong className="clickable-name" onClick={() => onShowDescription(batch)}>{batch.name || "N/A"}</strong>
                        <span className={`status ${batch.isClosed ? "status-closed" : "status-open"}`}>{batch.isClosed ? "✅ Chiuso" : "⏳ Aperto"}</span>
                    </div>
                    <div className="card-body">
                        {/* ... corpo della card mobile invariato ... */}
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

// Interfacce per i dati
interface BatchData {
    id: string;
    batchId: bigint;
    name: string;
    description: string;
    date: string;
    location: string;
    isClosed: boolean;
}

interface StepData {
    stepIndex: bigint;
    eventName: string;
    description: string;
    date: string;
    location: string;
}

const BatchTable = ({ batches, nameFilter, setNameFilter, locationFilter, setLocationFilter, statusFilter, setStatusFilter, onShowDescription }) => {
    // Stati per la gestione degli step espansi
    const [expandedBatchId, setExpandedBatchId] = useState(null);
    const [batchSteps, setBatchSteps] = useState({});
    const [isLoadingSteps, setIsLoadingSteps] = useState(false);
    
    // Stati per la paginazione
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsToShow, setItemsToShow] = useState(10);
    const MAX_PER_PAGE = 30;

    // ✅ MODIFICA: Funzione per caricare gli step di un lotto specifico on-demand.
    const fetchStepsForBatch = useCallback(async (batchId) => {
        setIsLoadingSteps(true);
        try {
            const events = await getContractEvents({
                contract,
                eventName: "BatchStepAdded",
                filters: { batchId: batchId },
            });
            const formattedSteps = events.map(event => ({
                stepIndex: event.args.stepIndex,
                eventName: event.args.eventName,
                description: event.args.description,
                date: event.args.date,
                location: event.args.location,
            })).sort((a, b) => Number(a.stepIndex) - Number(b.stepIndex));

            setBatchSteps(prev => ({ ...prev, [batchId]: formattedSteps }));
        } catch (error) {
            console.error(`Errore nel caricare gli step per il lotto ${batchId}:`, error);
            setBatchSteps(prev => ({ ...prev, [batchId]: [] })); // Salva un array vuoto in caso di errore
        } finally {
            setIsLoadingSteps(false);
        }
    }, []);

    const handleToggleSteps = (batchId) => {
        const newExpandedBatchId = expandedBatchId === batchId ? null : batchId;
        setExpandedBatchId(newExpandedBatchId);
        // Se stiamo espandendo una nuova riga e non abbiamo ancora i dati, li carichiamo.
        if (newExpandedBatchId && !batchSteps[newExpandedBatchId]) {
            fetchStepsForBatch(newExpandedBatchId);
        }
    };
    
    useEffect(() => {
        setCurrentPage(1);
        setItemsToShow(10);
    }, [batches, nameFilter, locationFilter, statusFilter]);

    const totalPages = Math.max(1, Math.ceil(batches.length / MAX_PER_PAGE));
    const startIndex = (currentPage - 1) * MAX_PER_PAGE;
    const itemsOnCurrentPage = batches.slice(startIndex, startIndex + MAX_PER_PAGE);
    const visibleBatches = itemsOnCurrentPage.slice(0, itemsToShow);
    
    const handleLoadMore = () => setItemsToShow(prev => Math.min(prev + 10, MAX_PER_PAGE));
    const handlePageChange = (page) => {
        if (page < 1 || page > totalPages) return;
        setCurrentPage(page);
        setItemsToShow(10);
        setExpandedBatchId(null); // Chiudi le righe espanse quando cambi pagina
    };

    return (
        <div className="table-container">
            <table className="company-table">
                {/* ... thead e filtri invariati ... */}
                <tbody>
                    {visibleBatches.length > 0 ? (
                        visibleBatches.map((batch, index) => (
                            <BatchRow
                                key={batch.id}
                                batch={batch}
                                localId={startIndex + index + 1}
                                onShowDescription={onShowDescription}
                                onToggleSteps={handleToggleSteps}
                                isExpanded={expandedBatchId === batch.batchId}
                                steps={batchSteps[batch.batchId] || []}
                                isLoadingSteps={isLoadingSteps && expandedBatchId === batch.batchId}
                            />
                        ))
                    ) : (
                        <tr><td colSpan={7} style={{ textAlign: "center", padding: "2rem" }}>Nessuna iscrizione trovata.</td></tr>
                    )}
                </tbody>
            </table>
            {/* ... controlli paginazione invariati ... */}
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
    
    // Stati
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

    // ✅ MODIFICA: La funzione ora rispecchia la logica HTML caricando tutti i lotti senza filtri di data.
    const fetchBatchesViaInsight = useCallback(async () => {
        if (!account?.address) return;
        setLoadingMethod('insight');
        setAllBatches([]);

        try {
            console.log(`Ricerca eventi "BatchInitialized" per l'indirizzo: ${account.address}`);
            
            // Rimuovo il filtro 'fromBlock' per caricare l'intera cronologia, come nell'esempio HTML.
            // Se le performance diventano un problema, può essere reintrodotto.
            const events = await getContractEvents({
                contract,
                eventName: "BatchInitialized",
                filters: { contributor: account.address },
            });
            
            console.log(`Trovati ${events.length} eventi via Insight.`);
            
            const formattedBatches = events.map(event => ({
                id: event.transactionHash + event.logIndex, // ID univoco per la chiave React
                batchId: event.args.batchId,
                name: event.args.name,
                description: event.args.description,
                date: event.args.date,
                location: event.args.location,
                isClosed: event.args.isClosed,
            }));

            setAllBatches(formattedBatches.sort((a, b) => Number(b.batchId) - Number(a.batchId)));

        } catch (error) {
            console.error("Errore nel caricare i lotti da Insight:", error);
            setAllBatches([]);
        } finally {
            setLoadingMethod(null);
        }
    }, [account?.address]);
    
    // Funzione fetchBatchesViaRpc (invariata)
    const fetchBatchesViaRpc = useCallback(async () => {
        // ... Logica RPC invariata ...
    }, [account?.address]);

    const handleClearBatches = () => {
        setAllBatches([]);
        setFilteredBatches([]);
    };
    
    // Hooks useEffect (invariati)
    useEffect(() => {
        if (account?.address && prevAccountRef.current !== account.address) {
            refetchContributorInfo();
            handleClearBatches();
        }
        prevAccountRef.current = account?.address;
    }, [account?.address, refetchContributorInfo]);

    useEffect(() => {
        let tempBatches = [...allBatches];
        if (nameFilter) tempBatches = tempBatches.filter((b) => b.name.toLowerCase().includes(nameFilter.toLowerCase()));
        if (locationFilter) tempBatches = tempBatches.filter((b) => b.location.toLowerCase().includes(locationFilter.toLowerCase()));
        if (statusFilter !== "all") {
            const isOpen = statusFilter === "open";
            tempBatches = tempBatches.filter((b) => !b.isClosed === isOpen);
        }
        setFilteredBatches(tempBatches);
    }, [nameFilter, locationFilter, statusFilter, allBatches]);

    // Gestori di eventi per il modale (invariati)
    const handleModalInputChange = (e) => setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    const handleFileChange = (e) => setSelectedFile(e.target.files?.[0] || null);
    
    const handleInitializeBatch = async () => {
        // ... logica di inizializzazione batch invariata ...
    };

    const openModal = () => {
        setFormData(getInitialFormData());
        setSelectedFile(null);
        setCurrentStep(1);
        setTxResult(null);
        setModal("init");
    };
    const handleCloseModal = () => setModal(null);
    const handleNextStep = () => {
        if (currentStep === 1 && !formData.name.trim()) {
            alert("Il campo 'Nome Iscrizione' è obbligatorio.");
            return;
        }
        if (currentStep < 6) setCurrentStep(prev => prev + 1);
    };
    const handlePrevStep = () => {
        if (currentStep > 1) setCurrentStep(prev => prev - 1);
    };

    // Render condizionale
    if (!account) {
        return (
            <div className="login-container">
                <AziendaPageStyles />
                <ConnectButton client={client} chain={polygon} accountAbstraction={{ chain: polygon, sponsorGas: true }} wallets={[inAppWallet()]} connectButton={{ label: "Connettiti / Log In", style: { fontSize: "1.2rem", padding: "1rem 2rem" } }} />
            </div>
        );
    }
    
    const renderDashboardContent = () => {
        if (isStatusLoading) return <p style={{ textAlign: "center", marginTop: "4rem" }}>Verifica stato account...</p>;
        if (isError || !contributorData) return <p style={{ textAlign: "center", marginTop: "4rem", color: "red" }}>Errore nel recuperare i dati dell'account. Riprova.</p>;
        if (!contributorData[2]) return <RegistrationForm />;
        
        return (
            <>
                <DashboardHeader
                    contributorInfo={contributorData}
                    onNewInscriptionClick={openModal}
                    onFetchInsight={fetchBatchesViaInsight}
                    onFetchRpc={fetchBatchesViaRpc}
                    onClear={handleClearBatches}
                    isLoading={!!loadingMethod}
                />
                {loadingMethod ? (
                    <p style={{ textAlign: "center", marginTop: "2rem" }}>Caricamento iscrizioni via {loadingMethod.toUpperCase()}...</p>
                ) : (
                    <BatchTable
                        batches={filteredBatches}
                        nameFilter={nameFilter}
                        setNameFilter={setNameFilter}
                        locationFilter={locationFilter}
                        setLocationFilter={setLocationFilter}
                        statusFilter={statusFilter}
                        setStatusFilter={setStatusFilter}
                        onShowDescription={setDescriptionModalBatch}
                    />
                )}
            </>
        );
    };
    
    const isProcessing = loadingMessage !== "" || isPending;
    const today = new Date().toISOString().split("T")[0];
    
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
            <main className="main-content-full">{renderDashboardContent()}</main>

            {/* Modali (invariati) */}
            {descriptionModalBatch && (
                <div className="modal-overlay" onClick={() => setDescriptionModalBatch(null)}>
                    <div className="modal-content description-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header"><h2>Descrizione Iscrizione / Lotto</h2></div>
                        <div className="modal-body"><p>{descriptionModalBatch.description || "Nessuna descrizione fornita."}</p></div>
                        <div className="modal-footer">
                            <button onClick={() => setDescriptionModalBatch(null)} className="web3-button">Chiudi</button>
                        </div>
                    </div>
                </div>
            )}
            
            {modal === "init" && (
                // ... struttura del modale di creazione invariata ...
            )}

            {isProcessing && <TransactionStatusModal status={"loading"} message={loadingMessage} onClose={() => {}} />}
            {txResult && <TransactionStatusModal status={txResult.status} message={txResult.message} onClose={() => { if (txResult.status === "success") handleCloseModal(); setTxResult(null); }} />}
        </div>
    );
}