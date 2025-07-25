// FILE: src/components/RegistrationForm.tsx
// DESCRIZIONE: Questo è un nuovo componente che contiene esclusivamente
// il modulo di registrazione per le nuove aziende.

import React, { useState } from 'react';

// Definiamo le "props" che il componente si aspetta di ricevere.
// In questo caso, ha bisogno solo dell'indirizzo del wallet da mostrare.
interface RegistrationFormProps {
  walletAddress: string;
}

const RegistrationForm: React.FC<RegistrationFormProps> = ({ walletAddress }) => {
  // Stato per gestire i dati del form
  const [formData, setFormData] = useState({
    companyName: "",
    contactEmail: "",
    sector: "",
    website: "",
    facebook: "",
    instagram: "",
    twitter: "",
    tiktok: "",
  });

  // Stato per gestire i messaggi di feedback (es. "Richiesta inviata!")
  const [status, setStatus] = useState<{ message: string; type: 'error' | 'success' | 'info' } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Funzione per aggiornare lo stato quando l'utente scrive nei campi
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Funzione che viene eseguita quando l'utente invia il form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.companyName || !formData.contactEmail || !formData.sector) {
      setStatus({ message: "Nome azienda, email e settore sono campi obbligatori.", type: 'error' });
      return;
    }
    setIsLoading(true);
    setStatus({ message: "Invio della richiesta in corso...", type: 'info' });

    try {
      // Qui ci sarà la logica per inviare l'email o salvare i dati
      // Per ora simuliamo una chiamata API
      console.log("Dati inviati:", { ...formData, walletAddress });
      
      // Simula un'attesa di 2 secondi
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Mostra un messaggio di successo
      setStatus({ message: "Richiesta inviata con successo! Verrai ricontattato dopo l'approvazione del tuo account.", type: 'success' });

    } catch (error) {
      setStatus({ message: (error as Error).message, type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  // Se la richiesta è stata inviata con successo, mostra solo il messaggio di conferma.
  if (status?.type === 'success') {
    return (
      <div className="card" style={{ marginTop: '2rem', textAlign: 'center' }}>
        <h3>Richiesta Inviata!</h3>
        <p>{status.message}</p>
      </div>
    );
  }

  // Altrimenti, mostra il form
  return (
    <div className="card" style={{ marginTop: '2rem', maxWidth: '700px', margin: '2rem auto', textAlign: 'left' }}>
      <h3>Benvenuto su Easy Chain!</h3>
      <p>Il tuo account non è ancora attivo. Compila il form di registrazione per inviare una richiesta di attivazione all'amministratore.</p>
      
      <form onSubmit={handleSubmit} style={{ marginTop: '1.5rem' }}>
        <div className="form-group">
          <label>Nome Azienda *</label>
          <input type="text" name="companyName" className="form-input" onChange={handleInputChange} required />
        </div>
        <div className="form-group">
          <label>Email di Contatto *</label>
          <input type="email" name="contactEmail" className="form-input" onChange={handleInputChange} required />
        </div>
        <div className="form-group">
          <label>Settore di Attività *</label>
          <select name="sector" className="form-input" onChange={handleInputChange} required defaultValue="">
            <option value="" disabled>Seleziona un settore...</option>
            <option value="Agroalimentare">Agroalimentare</option>
            <option value="Moda e Tessile">Moda e Tessile</option>
            <option value="Arredamento e Design">Arredamento e Design</option>
            <option value="Farmaceutico">Farmaceutico</option>
            <option value="Altro">Altro</option>
          </select>
        </div>
        <div className="form-group">
          <label>Indirizzo Wallet (automatico)</label>
          <input type="text" className="form-input" value={walletAddress} readOnly disabled />
        </div>
        
        <hr style={{ margin: '2rem 0', borderColor: '#333' }} />
        
        <h4>Profili Social (Opzionale)</h4>
        <div className="form-group">
          <label>Sito Web</label>
          <input type="url" name="website" className="form-input" onChange={handleInputChange} placeholder="https://..." />
        </div>
        <div className="form-group">
          <label>Facebook</label>
          <input type="url" name="facebook" className="form-input" onChange={handleInputChange} placeholder="https://facebook.com/..." />
        </div>
        <div className="form-group">
          <label>Instagram</label>
          <input type="url" name="instagram" className="form-input" onChange={handleInputChange} placeholder="https://instagram.com/..." />
        </div>
        <div className="form-group">
          <label>Twitter / X</label>
          <input type="url" name="twitter" className="form-input" onChange={handleInputChange} placeholder="https://x.com/..." />
        </div>
        <div className="form-group">
          <label>TikTok</label>
          <input type="url" name="tiktok" className="form-input" onChange={handleInputChange} placeholder="https://tiktok.com/..." />
        </div>
        
        <button type="submit" className="web3-button" disabled={isLoading} style={{ width: '100%', marginTop: '1rem' }}>
          {isLoading ? "Invio in corso..." : "Invia Richiesta di Attivazione"}
        </button>
        
        {status && status.type !== 'success' && (
          <p style={{ marginTop: '1rem', color: status.type === 'error' ? '#ff4d4d' : '#888', textAlign: 'center' }}>
            {status.message}
          </p>
        )}
      </form>
    </div>
  );
};

export default RegistrationForm;
