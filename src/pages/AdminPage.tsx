// FILE: src/pages/AdminPage.tsx
// VERSIONE AGGIORNATA CON LAYOUT MOBILE RESPONSIVE

import React, { useState, useEffect, useCallback } from "react";
import { ConnectButton, TransactionButton, useActiveAccount } from "thirdweb/react";
import { createThirdwebClient, getContract, readContract, prepareContractCall } from "thirdweb";
import { polygon } from "thirdweb/chains";
import { supplyChainABI as abi } from "../abi/contractABI";
import "../App.css";

// --- NUOVO: Componente per gli stili della pagina ---
const AdminPageStyles = () => (
  <style>{`
    .header {
      flex-wrap: wrap;
    }
    .filters-container {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
      margin-bottom: 1.5rem;
    }
    .filters-container > .form-input {
      flex-grow: 1;
      min-width: 200px; /* Evita che i filtri diventino troppo piccoli */
    }
    .company-table .desktop-row {
      display: table-row;
    }
    .company-table .mobile-card-row {
      display: none;
    }

    /* Media Query per schermi sotto i 768px (tablet e telefoni) */
    @media (max-width: 768px) {
      .header {
        flex-direction: column;
        align-items: flex-start;
        gap: 1rem;
      }
      .filters-container {
        flex-direction: column;
      }
      .filters-container > .form-input {
        width: 100%;
      }
      .company-table thead {
        display: none; /* Nasconde l'header della tabella su mobile */
      }
      .company-table .desktop-row {
        display: none; /* Nasconde la riga desktop su mobile */
      }
      .company-table .mobile-card-row {
        display: block; /* Mostra la riga-card su mobile */
        margin-bottom: 1rem;
        border: 1px solid #3e3e3e;
        border-radius: 8px;
        background-color: #2c2c2c;
      }
      .company-table .mobile-card-row td {
        display: block;
        width: 100%;
        padding: 1rem;
      }
      .mobile-card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid #444;
        padding-bottom: 0.75rem;
        margin-bottom: 0.75rem;
      }
      .mobile-card-header h4 {
        margin: 0;
        font-size: 1.1rem;
      }
      .mobile-card-body p {
        margin: 0.5rem 0;
        display: flex;
        justify-content: space-between;
      }
      .mobile-card-body p strong {
        color: #aaa;
        margin-right: 1rem;
      }
      .mobile-card-footer {
        margin-top: 1rem;
        padding-top: 1rem;
        border-top: 1px solid #444;
      }
      .mobile-card-footer .web3-button {
        width: 100%;
      }
    }
  `}</style>
);


// Definizione del tipo per un'azienda per una migliore gestione
type Company = {
  id: string;
  companyName: string;
  walletAddress: `0x${string}`;
  status: 'active' | 'pending' | 'deactivated';
  credits?: number;
  contactEmail?: string;
};

// Configurazione del Client e del Contratto
const client = createThirdwebClient({ 
  clientId: "023dd6504a82409b2bc7cb971fd35b16"
});

const contract = getContract({ 
  client, 
  chain: polygon,
  address: "0x0c5e6204e80e6fb3c0c7098c4fa84b2210358d0b"
});


// --- Componente Modale per la Modifica (Invariato) ---
const EditCompanyModal = ({ company, onClose, onUpdate }: { company: Company, onClose: () => void, onUpdate: () => void }) => {
  const [credits, setCredits] = useState(company.credits || 0);
  const [newName, setNewName] = useState(company.companyName);

  const updateOffChainStatus = async (action: string, customData: Partial<Company> = {}) => {
    try {
      const bodyPayload = {
        action,
        walletAddress: company.walletAddress,
        credits: parseInt(String(credits)),
        companyName: newName,
        ...customData,
      };
      await fetch('/api/activate-company', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload),
      });
      onUpdate();
    } catch (error) {
      alert(`Errore nell'aggiornare il database: ${(error as Error).message}`);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Sei sicuro di voler eliminare definitivamente ${company.companyName} dalla lista?`)) return;
    try {
      await fetch('/api/delete-company', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: company.walletAddress, status: company.status }),
      });
      alert("Azienda eliminata dalla lista.");
      onUpdate();
      onClose();
    } catch (error) {
       alert(`Errore: ${(error as Error).message}`);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Gestisci: {company.companyName}</h2>
        <p><strong>Wallet:</strong> <span style={{wordBreak: 'break-all'}}>{company.walletAddress}</span></p>
        <hr style={{margin: '1.5rem 0', borderColor: '#27272a'}}/>
        <div className="form-group">
          <label>Azioni Stato Contributor</label>
          <div className="modal-actions">
            {company.status === 'pending' && (
              <TransactionButton transaction={() => prepareContractCall({ contract, abi, method: "function addContributor(address, string)", params: [company.walletAddress, newName] })} onTransactionConfirmed={() => { alert("Azienda attivata on-chain!"); updateOffChainStatus('activate'); onClose(); }} onError={(error) => alert(`Errore: ${error.message}`)} className="web3-button">✅ Attiva Contributor</TransactionButton>
            )}
            {company.status === 'active' && (
              <TransactionButton transaction={() => prepareContractCall({ contract, abi, method: "function deactivateContributor(address)", params: [company.walletAddress] })} onTransactionConfirmed={() => { alert("Azienda disattivata on-chain!"); updateOffChainStatus('deactivate'); }} onError={(error) => alert(`Errore: ${error.message}`)} className="web3-button" style={{backgroundColor: '#f59e0b'}}>❌ Disattiva Contributor</TransactionButton>
            )}
            {company.status === 'deactivated' && (
              <TransactionButton transaction={() => prepareContractCall({ contract, abi, method: "function addContributor(address, string)", params: [company.walletAddress, newName] })} onTransactionConfirmed={() => { alert("Azienda riattivata on-chain!"); updateOffChainStatus('reactivate'); }} onError={(error) => alert(`Errore: ${error.message}`)} className="web3-button">✅ Riattiva Contributor</TransactionButton>
            )}
          </div>
        </div>
        <div className="form-group" style={{marginTop: '1.5rem'}}>
          <label>Gestione Crediti</label>
          <p>Crediti disponibili: <strong>{company.status === 'pending' ? 0 : company.credits ?? 'N/D'}</strong></p>
          <input type="number" placeholder="Imposta nuovi crediti" value={credits} onChange={(e) => setCredits(Number(e.target.value))} className="form-input" style={{marginTop: '0.5rem'}} />
          <TransactionButton transaction={() => prepareContractCall({ contract, abi, method: "function setContributorCredits(address, uint256)", params: [company.walletAddress, BigInt(credits)] })} onTransactionConfirmed={() => { alert("Crediti impostati on-chain!"); updateOffChainStatus('setCredits'); }} onError={(error) => alert(`Errore: ${error.message}`)} className="web3-button" style={{marginTop: '0.5rem', width: '100%'}} disabled={company.status === 'pending'}>Aggiorna Crediti</TransactionButton>
        </div>
        <div className="form-group" style={{marginTop: '1.5rem'}}>
            <label>Cambia Nome Azienda</label>
            <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} className="form-input" placeholder="Nuovo nome azienda" />
            <TransactionButton transaction={() => prepareContractCall({ contract, abi, method: "function addContributor(address, string)", params: [company.walletAddress, newName] })} onTransactionConfirmed={() => { alert("Nome azienda aggiornato on-chain!"); updateOffChainStatus('changeName', { companyName: newName }); }} onError={(error) => alert(`Errore: ${error.message}`)} className="web3-button" style={{marginTop: '0.5rem', width: '100%'}} disabled={!newName.trim() || newName === company.companyName}>Cambia Nome</TransactionButton>
        </div>
        {(company.status === 'pending' || company.status === 'deactivated') && (
          <div style={{marginTop: '1.5rem', borderTop: '1px solid #27272a', paddingTop: '1.5rem'}}>
              <button onClick={handleDelete} className="web3-button" style={{backgroundColor: '#ef4444', width: '100%'}}>Elimina Definitivamente</button>
          </div>
        )}
        <button onClick={onClose} style={{marginTop: '2rem', background: 'none', border: 'none', color: '#a0a0a0', cursor: 'pointer'}}>Chiudi</button>
      </div>
    </div>
  );
};


// --- Componente per la Lista delle Aziende (MODIFICATO PER RESPONSIVE) ---
const CompanyList = () => {
    const [allCompanies, setAllCompanies] = useState<Company[]>([]);
    const [filteredCompanies, setFilteredCompanies] = useState<Company[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterStatus, setFilterStatus] = useState("all");
    const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

    const fetchCompanies = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch('/api/get-pending-companies');
            if (!response.ok) { throw new Error(`Errore HTTP: ${response.status}`); }
            const data = await response.json();
            const pending = (data.pending || []).map((p: any) => ({ ...p, status: 'pending', id: p.walletAddress }));
            const active = (data.active || []).map((a: any) => ({ ...a, status: a.status || 'active', id: a.walletAddress }));
            setAllCompanies([...pending, ...active]);
        } catch (err: any) { setError(`Impossibile caricare i dati: ${err.message}`); }
        setIsLoading(false);
    }, []);

    useEffect(() => { fetchCompanies(); }, [fetchCompanies]);

    useEffect(() => {
        let companies = [...allCompanies];
        if (filterStatus !== "all") { companies = companies.filter(c => c.status === filterStatus); }
        if (searchTerm) { companies = companies.filter(c => c.companyName.toLowerCase().includes(searchTerm.toLowerCase())); }
        setFilteredCompanies(companies);
    }, [searchTerm, filterStatus, allCompanies]);

    const getStatusIcon = (status: Company['status']) => {
        if (status === 'active') return '✅';
        if (status === 'pending') return '⏳';
        return '❌';
    }

    return (
        <div style={{ marginTop: '2rem' }}>
            <div className="filters-container">
                <input type="text" placeholder="Cerca per nome azienda..." className="form-input" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                <select className="form-input" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                    <option value="all">Tutti gli stati</option><option value="active">Attivate</option><option value="pending">In Pending</option><option value="deactivated">Disattivate</option>
                </select>
            </div>
            {error && <p style={{ color: '#ef4444' }}>{error}</p>}
            <table className="company-table">
                <thead>
                    <tr className="desktop-row">
                        <th>Stato</th><th>Nome Azienda</th><th>Wallet</th><th>Email</th><th>Azione</th>
                    </tr>
                </thead>
                <tbody>
                    {isLoading ? (<tr><td colSpan={5} style={{textAlign: 'center', padding: '2rem'}}>Caricamento...</td></tr>) : 
                    filteredCompanies.length > 0 ? (
                        filteredCompanies.map(c => (
                        <React.Fragment key={c.id}>
                            {/* Riga per Desktop */}
                            <tr className="desktop-row">
                                <td>{getStatusIcon(c.status)}</td>
                                <td>{c.companyName}</td>
                                <td>{c.walletAddress}</td>
                                <td>{c.contactEmail || "/"}</td>
                                <td><button onClick={() => setSelectedCompany(c)} className="web3-button" style={{padding: '0.5rem 1rem'}}>Gestisci</button></td>
                            </tr>
                            {/* Card per Mobile */}
                            <tr className="mobile-card-row">
                                <td>
                                    <div className="mobile-card-header">
                                        <h4>{c.companyName}</h4>
                                        <span>{getStatusIcon(c.status)}</span>
                                    </div>
                                    <div className="mobile-card-body">
                                        <p><strong>Email:</strong> <span>{c.contactEmail || "/"}</span></p>
                                        <p><strong>Wallet:</strong> <span style={{wordBreak: 'break-all'}}>{c.walletAddress}</span></p>
                                    </div>
                                    <div className="mobile-card-footer">
                                        <button onClick={() => setSelectedCompany(c)} className="web3-button">Gestisci</button>
                                    </div>
                                </td>
                            </tr>
                        </React.Fragment>
                        ))) : 
                    (<tr><td colSpan={5} style={{textAlign: 'center', padding: '2rem'}}>Nessuna azienda trovata.</td></tr>)}
                </tbody>
            </table>
            {selectedCompany && <EditCompanyModal company={selectedCompany} onClose={() => setSelectedCompany(null)} onUpdate={fetchCompanies} />}
        </div>
    );
};


// --- Componente Principale della Pagina Admin (Completo) ---
const AdminContent = () => {
    const account = useActiveAccount();
    const [isAllowed, setIsAllowed] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const checkPermissions = async () => {
            if (account) {
                setIsLoading(true);
                try {
                    const [superOwner, owner] = await Promise.all([
                        readContract({ contract, abi, method: "function superOwner() view returns (address)" }),
                        readContract({ contract, abi, method: "function owner() view returns (address)" })
                    ]);
                    const isAdmin = account.address.toLowerCase() === superOwner.toLowerCase() || (owner && account.address.toLowerCase() === owner.toLowerCase());
                    setIsAllowed(isAdmin);
                } catch (e) { setIsAllowed(false); }
                finally { setIsLoading(false); }
            } else {
                setIsLoading(false);
                setIsAllowed(false);
            }
        };
        checkPermissions();
    }, [account]);

    if (!account) { return <p style={{textAlign: 'center', marginTop: '2rem'}}>Connetti il tuo wallet da amministratore per accedere.</p>; }
    if (isLoading) { return <p style={{textAlign: 'center', marginTop: '2rem'}}>Verifica permessi in corso...</p>; }
    return isAllowed ? <div><h3>Benvenuto, SFY Labs!</h3><CompanyList /></div> : <h2 style={{ color: '#ef4444', fontSize: '2rem', marginTop: '4rem' }}>❌ ACCESSO NEGATO</h2>;
};


export default function AdminPage() {
  return (
    <div className="app-container">
      <AdminPageStyles /> {/* Includi gli stili qui */}
      <main className="main-content" style={{width: '100%'}}>
        <header className="header" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 className="page-title">Pannello Amministrazione</h1>
          <ConnectButton client={client} chain={polygon} />
        </header>
        <AdminContent />
      </main>
    </div>
  );
}
