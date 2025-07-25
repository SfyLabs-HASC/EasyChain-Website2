// FILE: src/components/ContributorDashboard.tsx
// DESCRIZIONE: Questo componente visualizza la dashboard per un'azienda
// che è già stata verificata e attivata.

import React from 'react';

interface ContributorDashboardProps {
  // Il 'data' prop è una tupla che arriva dall'hook useReadContract
  // e contiene [nomeAzienda, crediti, èAttivo]
  data: readonly [string, bigint, boolean];
  onNewInscriptionClick: () => void;
}

const ContributorDashboard: React.FC<ContributorDashboardProps> = ({ data, onNewInscriptionClick }) => {
    // Estraiamo i dati dalla tupla per leggibilità
    const [companyName, credits] = data;
    
    return (
        <div className="contributor-dashboard">
            <div className="dashboard-info">
                <h2>{companyName}</h2>
                <p>Crediti Rimanenti: <strong>{credits.toString()}</strong></p>
                <p>Stato: <strong className="status-active">ATTIVO ✅</strong></p>
            </div>
            <div className="dashboard-actions">
                <button onClick={onNewInscriptionClick} className="web3-button" style={{padding: '0.8rem 1.5rem', fontSize: '1rem'}}>
                    Nuova Iscrizione
                </button>
            </div>
        </div>
    );
};

export default ContributorDashboard;
