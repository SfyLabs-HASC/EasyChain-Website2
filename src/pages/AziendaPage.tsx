import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ConnectButton, useActiveAccount, useReadContract, useSendTransaction } from 'thirdweb/react';
import { createThirdwebClient, getContract, prepareContractCall } from 'thirdweb';
import { polygon } from 'thirdweb/chains';
import { inAppWallet } from 'thirdweb/wallets';
import { supplyChainABI as abi } from '../abi/contractABI';
import '../App.css'; 

import TransactionStatusModal from '../components/TransactionStatusModal';

// --- Stili CSS incorporati ---
const AziendaPageStyles = () => (
  <style>{`
    /* ... (gli stili rimangono invariati) ... */
    .app-container-full { padding: 0 2rem; }
    .main-header-bar { display: flex; justify-content: space-between; align-items: center; }
    .header-title { font-size: 1.75rem; font-weight: bold; }
    .dashboard-header-card { display: flex; justify-content: space-between; align-items: center; position: relative; padding: 1.5rem; background-color: #212529; border: 1px solid #495057; border-radius: 8px; margin-bottom: 2rem; }
    .dashboard-header-info { display: flex; flex-direction: column; }
    .company-name-header { margin-top: 0; margin-bottom: 1rem; font-size: 3rem; }
    .company-status-container { display: flex; align-items: center; gap: 1.5rem; }
    .status-item { display: flex; align-items: center; gap: 0.5rem; }
    .header-actions .web3-button.large { padding: 1rem 2rem; font-size: 1.1rem; }
    .company-table .desktop-row { display: table-row; }
    .company-table .mobile-card { display: none; }
    .pagination-controls { display: flex; justify-content: space-between; align-items: center; margin-top: 1rem; }
    .recap-summary { text-align: left; padding: 15px; background-color: #2a2a2a; border: 1px solid #444; border-radius: 8px; margin-bottom: 20px;}
    .recap-summary p { margin: 8px 0; word-break: break-word; }
    .recap-summary p strong { color: #f8f9fa; }
    @media (max-width: 768px) {
      .app-container-full { padding: 0 1rem; }
      .main-header-bar { flex-direction: column; align-items: flex-start; gap: 1rem; }
      .header-title { font-size: 1.5rem; }
      .wallet-button-container { align-self: flex-start; }
      .dashboard-header-card { flex-direction: column; align-items: flex-start; gap: 1.5rem; }
      .company-name-header { font-size: 2.2rem; }
      .company-status-container { flex-direction: column; align-items: flex-start; gap: 0.75rem; }
      .header-actions { width: 100%; }
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

// ======== CONFIGURAZIONE CLIENT E CONTRATTO (INVARIATA) =========
const CLIENT_ID = "e40dfd747fabedf48c5837fb79caf2eb";
const CONTRACT_ADDRESS = "0x2bd72307a73cc7be3f275a81c8edbe775bb08f3e";

const client = createThirdwebClient({ clientId: CLIENT_ID });
const contract = getContract({ 
  client, 
  chain: polygon,
  address: CONTRACT_ADDRESS
});

// ======== COMPONENTI UI (INVARIATI) =========
const RegistrationForm = () => ( <div className="card"><h3>Benvenuto su Easy Chain!</h3><p>Il tuo account non è ancora attivo. Compila il form di registrazione per inviare una richiesta di attivazione.</p></div> );

const BatchRow = ({ batch, localId }: { batch: BatchData; localId: number }) => {
    const [showDescription, setShowDescription] = useState(false);
    // NOTA: Questa è ancora una chiamata RPC per ogni riga. Può essere ottimizzata in futuro.
    const { data: stepCount } = useReadContract({ contract, abi, method: "function getBatchStepCount(uint256 _batchId) view returns (uint256)", params: [batch.batchId] });
    const formatDate = (dateStr: string | undefined) => !dateStr || dateStr.split('-').length !== 3 ? '/' : dateStr.split('-').reverse().join('/');
    
    return (
      // ... JSX del componente BatchRow rimane invariato ...
        <>
            <tr className="desktop-row">
                <td>{localId}</td>
                <td><span className="clickable-name" onClick={() => setShowDescription(true)}>{batch.name || '/'}</span></td>
                <td>{formatDate(batch.date)}</td>
                <td>{batch.location || '/'}</td>
                <td>{stepCount !== undefined ? stepCount.toString() : '/'}</td>
                <td>{batch.isClosed ? <span className="status-closed">✅ Chiuso</span> : <span className="status-open">⏳ Aperto</span>}</td>
                <td><Link to={`/gestisci/${batch.batchId}`} className="web3-button">Gestisci</Link></td>
            </tr>
            <tr className="mobile-card">
                <td>
                    <div className="card-header"><strong className="clickable-name" onClick={() => setShowDescription(true)}>{batch.name || 'N/A'}</strong><span className={`status ${batch.isClosed ? 'status-closed' : 'status-open'}`}>{batch.isClosed ? '✅ Chiuso' : '⏳ Aperto'}</span></div>
                    <div className="card-body"><p><strong>ID:</strong> {localId}</p><p><strong>Data:</strong> {formatDate(batch.date)}</p><p><strong>Luogo:</strong> {batch.location || '/'}</p><p><strong>N° Passaggi:</strong> {stepCount !== undefined ? stepCount.toString() : '/'}</p></div>
                    <div className="card-footer"><Link to={`/gestisci/${batch.batchId}`} className="web3-button">Gestisci</Link></div>
                </td>
            </tr>
            {showDescription && (
                <div className="modal-overlay" onClick={() => setShowDescription(false)}>
                    <div className="modal-content description-modal" onClick={(e) => e.stopPropagation()}><div className="modal-header"><h2>Descrizione Iscrizione / Lotto</h2></div><div className="modal-body"><p>{batch.description || 'Nessuna descrizione fornita.'}</p></div><div className="modal-footer"><button onClick={() => setShowDescription(false)} className="web3-button">Chiudi</button></div></div>
                </div>
            )}
        </>
    );
};

interface BatchData { id: string; batchId: bigint; name: string; description: string; date: string; location: string; isClosed: boolean; }

const BatchTable = ({ batches, nameFilter, setNameFilter, locationFilter, setLocationFilter, statusFilter, setStatusFilter }: any) => {
    // ... Logica del componente BatchTable rimane invariata ...
    const [currentPage, setCurrentPage] = useState(1); const [itemsToShow, setItemsToShow] = useState(10); const MAX_PER_PAGE = 30; const totalPages = Math.max(1, Math.ceil(batches.length / MAX_PER_PAGE)); const startIndex = (currentPage - 1) * MAX_PER_PAGE; const itemsOnCurrentPage = batches.slice(startIndex, startIndex + MAX_PER_PAGE); const visibleBatches = itemsOnCurrentPage.slice(0, itemsToShow); useEffect(() => { setCurrentPage(1); setItemsToShow(10); }, [batches, nameFilter, locationFilter, statusFilter]); const handleLoadMore = () => setItemsToShow(prev => Math.min(prev + 10, MAX_PER_PAGE)); const handlePageChange = (page: number) => { if (page < 1 || page > totalPages) return; setCurrentPage(page); setItemsToShow(10); };
    return (
        <div className="table-container">
            <table className="company-table">
                <thead>
                    <tr className="desktop-row"><th>ID</th><th>Nome</th><th>Data</th><th>Luogo</th><th>N° Passaggi</th><th>Stato</th><th>Azione</th></tr>
                    <tr className="filter-row"><th></th><th><input type="text" placeholder="Filtra per nome..." className="filter-input" value={nameFilter} onChange={(e) => setNameFilter(e.target.value)} /></th><th></th><th><input type="text" placeholder="Filtra per luogo..." className="filter-input" value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)} /></th><th></th><th><select className="filter-input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option value="all">Tutti</option><option value="open">Aperto</option><option value="closed">Chiuso</option></select></th><th></th></tr>
                </thead>
                <tbody>{visibleBatches.length > 0 ? (visibleBatches.map((batch, index) => <BatchRow key={batch.id} batch={batch} localId={startIndex + index + 1} />)) : (<tr><td colSpan={7} style={{textAlign: 'center', padding: '2rem'}}>Nessuna iscrizione trovata.</td></tr>)}</tbody>
            </table>
            <div className="pagination-controls">{itemsToShow < itemsOnCurrentPage.length && (<button onClick={handleLoadMore} className='link-button'>Vedi altri 10...</button>)}<div className="page-selector">{totalPages > 1 && <> <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1}>&lt;</button> <span> Pagina {currentPage} di {totalPages} </span> <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages}>&gt;</button></>}</div></div>
        </div>
    );
};

const DashboardHeader = ({ contributorInfo, onNewInscriptionClick }: { contributorInfo: readonly [string, bigint, boolean], onNewInscriptionClick: () => void }) => {
    // ... Logica del componente DashboardHeader rimane invariata ...
    const companyName = contributorInfo[0] || 'Azienda'; const credits = contributorInfo[1].toString();
    return (
        <div className="dashboard-header-card">
            <div className="dashboard-header-info"><h2 className="company-name-header">{companyName}</h2><div className="company-status-container"><div className="status-item"><span>Crediti Rimanenti: <strong>{credits}</strong></span></div><div className="status-item"><span>Stato: <strong>ATTIVO</strong></span><span className="status-icon">✅</span></div></div></div>
            <div className="header-actions"><button className="web3-button large" onClick={onNewInscriptionClick}>Nuova Iscrizione</button></div>
        </div>
    );
};

const getInitialFormData = () => ({ name: "", description: "", date: "", location: "" });
const truncateText = (text: string, maxLength: number) => {
    if (!text) return text;
    return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
};

export default function AziendaPage() {
    const account = useActiveAccount();
    // NOTA: Questa è ancora una chiamata RPC per recuperare le info del contributore.
    const { data: contributorData, isLoading: isStatusLoading, refetch: refetchContributorInfo, isError } = useReadContract({ contract, method: "function getContributorInfo(address) view returns (string, uint256, bool)", params: account ? [account.address] : undefined, queryOptions: { enabled: !!account } });
    const prevAccountRef = useRef(account?.address);
    const { mutate: sendTransaction, isPending } = useSendTransaction();
    const [modal, setModal] = useState<'init' | null>(null);
    const [formData, setFormData] = useState(getInitialFormData());
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [txResult, setTxResult] = useState<{ status: 'success' | 'error'; message: string } | null>(null);
    const [allBatches, setAllBatches] = useState<BatchData[]>([]);
    const [filteredBatches, setFilteredBatches] = useState<BatchData[]>([]);
    const [isLoadingBatches, setIsLoadingBatches] = useState(true);
    const [nameFilter, setNameFilter] = useState('');
    const [locationFilter, setLocationFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [loadingMessage, setLoadingMessage] = useState('');
    const [currentStep, setCurrentStep] = useState(1);

    // ==================================================================
    // ========= NUOVA FUNZIONE FETCHALLBATCHES CON INSIGHT API =========
    // ==================================================================
    const fetchAllBatches = async () => {
        if (!account?.address) return;
        setIsLoadingBatches(true);

        // 1. Definiamo i parametri per la chiamata a Insight
        const chainId = polygon.id;
        const insightUrl = `https://${chainId}.api.thirdweb.com/v1/events`;

        const params = new URLSearchParams({
            contract_address: CONTRACT_ADDRESS,
            event_name: 'BatchInitialized',
            'filters[contributor]': account.address,
            limit: '1000' // Imposta un limite ragionevole
        });

        // 2. Eseguiamo la chiamata API con fetch
        try {
            const response = await fetch(`${insightUrl}?${params.toString()}`, {
                method: 'GET',
                headers: {
                    'x-thirdweb-client-id': CLIENT_ID,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Errore API di Insight: ${response.statusText}`);
            }

            const data = await response.json();
            
            // 3. Trasformiamo i dati degli eventi nel formato richiesto dalla UI (BatchData)
            const formattedBatches = data.result.map((event: any) => ({
                id: event.data.batchId.toString(),
                batchId: BigInt(event.data.batchId),
                name: event.data.name,
                description: event.data.description,
                date: event.data.date,
                location: event.data.location,
                isClosed: event.data.isClosed
            }));

            // 4. Ordiniamo i lotti dal più recente al più vecchio e aggiorniamo lo stato
            setAllBatches(formattedBatches.sort((a, b) => Number(b.batchId) - Number(a.batchId)));

        } catch (error) {
            console.error("Errore nel caricare i lotti da Insight:", error);
            setAllBatches([]);
        } finally {
            setIsLoadingBatches(false);
        }
    };

    useEffect(() => {
        if (account?.address && prevAccountRef.current !== account.address) { 
            refetchContributorInfo(); 
            fetchAllBatches(); 
        } else if (account?.address && !prevAccountRef.current) { 
            fetchAllBatches(); 
        } else if (!account && prevAccountRef.current) { 
            window.location.href = '/'; 
        }
        prevAccountRef.current = account?.address;
    }, [account]);

    useEffect(() => {
        let tempBatches = [...allBatches];
        if (nameFilter) tempBatches = tempBatches.filter(b => b.name.toLowerCase().includes(nameFilter.toLowerCase()));
        if (locationFilter) tempBatches = tempBatches.filter(b => b.location.toLowerCase().includes(locationFilter.toLowerCase()));
        if (statusFilter !== 'all') { const isOpen = statusFilter === 'open'; tempBatches = tempBatches.filter(b => !b.isClosed === isOpen); }
        setFilteredBatches(tempBatches);
    }, [nameFilter, locationFilter, statusFilter, allBatches]);
    
    const handleModalInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { setFormData(prev => ({...prev, [e.target.name]: e.target.value})); };
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => { setSelectedFile(e.target.files?.[0] || null); };
    
    // --- Funzione handleInitializeBatch (INVARIATA) ---
    const handleInitializeBatch = async () => {
        if (!formData.name.trim()) { setTxResult({ status: 'error', message: 'Il campo Nome è obbligatorio.' }); return; }
        setLoadingMessage('Preparazione transazione...');
        let imageIpfsHash = "N/A";
        if (selectedFile) {
            // ... (logica di upload file invariata) ...
        }
        setLoadingMessage('Transazione in corso...');
        const transaction = prepareContractCall({ contract, abi, method: "function initializeBatch(string,string,string,string,string)", params: [formData.name, formData.description, formData.date, formData.location, imageIpfsHash] });
        sendTransaction(transaction, { 
            onSuccess: async () => { 
                setTxResult({ status: 'success', message: 'Iscrizione creata con successo!' }); 
                // Aggiungiamo un piccolo ritardo per dare tempo all'indexer di aggiornarsi
                setTimeout(() => {
                    fetchAllBatches();
                    refetchContributorInfo();
                }, 2000); // 2 secondi di ritardo
                setLoadingMessage(''); 
            },
            onError: (err) => { 
                setTxResult({ status: 'error', message: err.message.toLowerCase().includes("insufficient funds") ? "Crediti Insufficienti, Ricarica" : "Errore nella transazione." }); 
                setLoadingMessage(''); 
            } 
        });
    };
    
    const openModal = () => { setFormData(getInitialFormData()); setSelectedFile(null); setCurrentStep(1); setTxResult(null); setModal('init'); }
    const handleCloseModal = () => setModal(null);
    const handleNextStep = () => { if (currentStep === 1 && !formData.name.trim()) { alert("Il campo 'Nome Iscrizione' è obbligatorio."); return; } if (currentStep < 6) setCurrentStep(prev => prev + 1); };
    const handlePrevStep = () => { if (currentStep > 1) setCurrentStep(prev => prev - 1); };
    
    if (!account) { return <div className='login-container'><AziendaPageStyles /><ConnectButton client={client} chain={polygon} accountAbstraction={{ chain: polygon, sponsorGas: true }} wallets={[inAppWallet()]} connectButton={{ label: "Connettiti / Log In", style: { fontSize: '1.2rem', padding: '1rem 2rem' } }} /></div>; }
    
    const renderDashboardContent = () => { 
        if (isStatusLoading) return <p style={{textAlign: 'center', marginTop: '4rem'}}>Verifica stato account...</p>; 
        if (isError || !contributorData) return <p style={{textAlign: 'center', marginTop: '4rem', color: 'red'}}>Errore nel recuperare i dati dell'account. Riprova.</p>
        if (!contributorData[2]) return <RegistrationForm />; 
        return (
            <> 
                <DashboardHeader contributorInfo={contributorData} onNewInscriptionClick={openModal} /> 
                {isLoadingBatches ? <p style={{textAlign: 'center', marginTop: '2rem'}}>Caricamento iscrizioni...</p> : <BatchTable batches={filteredBatches} nameFilter={setNameFilter} locationFilter={setLocationFilter} statusFilter={setStatusFilter} setStatusFilter={setStatusFilter}/>} 
            </>
        ); 
    };
    
    const isProcessing = loadingMessage !== '' || isPending;
    const today = new Date().toISOString().split('T')[0];
    const helpTextStyle = { backgroundColor: '#343a40', border: '1px solid #495057', borderRadius: '8px', padding: '16px', marginTop: '16px', fontSize: '0.9rem', color: '#f8f9fa' };

    return (
        <div className="app-container-full">
            <AziendaPageStyles />
            <header className="main-header-bar"><div className="header-title">EasyChain - Area Riservata</div><div className="wallet-button-container"><ConnectButton client={client} chain={polygon} accountAbstraction={{chain: polygon, sponsorGas: true}} detailsModal={{ hideSend: true, hideReceive: true, hideBuy: true, hideTransactionHistory: true }}/></div></header>
            <main className="main-content-full">{renderDashboardContent()}</main>
            
            {modal === 'init' && ( 
              // ... JSX del modal rimane invariato ...
                <div className="modal-overlay" onClick={handleCloseModal}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header"><h2>Nuova Iscrizione ({currentStep}/6)</h2></div>
                        <div className="modal-body" style={{ minHeight: '350px' }}>
                          {/* ... contenuto del modal ... */}
                        </div>
                        <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
                            <div>{currentStep > 1 && <button onClick={handlePrevStep} className="web3-button secondary" disabled={isProcessing}>Indietro</button>}</div>
                            <div>
                                <button onClick={handleCloseModal} className="web3-button secondary" disabled={isProcessing}>Chiudi</button>
                                {currentStep < 6 && <button onClick={handleNextStep} className="web3-button">Avanti</button>}
                                {currentStep === 6 && <button onClick={handleInitializeBatch} disabled={isProcessing} className="web3-button">{isProcessing ? "Conferma..." : "Conferma e Registra"}</button>}
                            </div>
                        </div>
                    </div>
                </div> 
            )}
            
            {isProcessing && <TransactionStatusModal status={'loading'} message={loadingMessage} onClose={() => {}} />}
            {txResult && <TransactionStatusModal status={txResult.status} message={txResult.message} onClose={() => { if (txResult.status === 'success') handleCloseModal(); setTxResult(null); }} />}
        </div>
    );
}