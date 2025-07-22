// FILE: /api/activate-company.js
// Questo file gestisce diverse azioni per aggiornare i dati delle aziende su Firebase.

import admin from 'firebase-admin';

// --- Funzione per inizializzare Firebase Admin in modo sicuro ---
// Assicura che Firebase venga inizializzato solo una volta.
function initializeFirebaseAdmin() {
  if (!admin.apps.length) {
    try {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          // Sostituisce i caratteri di nuova riga per la chiave privata letta dalle variabili d'ambiente
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
      });
    } catch (error) {
      console.error('Firebase admin initialization error', error.stack);
    }
  }
  return admin.firestore();
}

const db = initializeFirebaseAdmin();

// --- Funzione Principale dell'API ---
export default async (req, res) => {
  // Accetta solo richieste di tipo POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { action, walletAddress, companyName, credits } = req.body;

  if (!action || !walletAddress) {
      return res.status(400).json({ error: 'Azione e indirizzo wallet sono obbligatori.' });
  }

  // NOTA: Questo è un punto cruciale. Devi sapere in quale collection si trova l'azienda.
  // Se un'azienda può essere in 'pendingCompanies' o 'activeCompanies', dovrai cercarla in entrambe.
  // Per semplicità, qui assumiamo che l'azienda da modificare sia in 'activeCompanies'.
  // Potresti dover adattare questa logica.
  const companyDocRef = db.collection('activeCompanies').doc(walletAddress);

  try {
    // Usa uno switch per eseguire l'operazione corretta in base all'azione ricevuta
    switch (action) {
      case 'activate':
      case 'reactivate':
        // Attiva o riattiva l'azienda, impostando i dati principali.
        // 'merge: true' è utile per non sovrascrivere campi esistenti che non vengono passati.
        await companyDocRef.set({
          companyName: companyName,
          credits: credits,
          status: 'active',
        }, { merge: true });
        break;

      case 'deactivate':
        // Aggiorna solo lo stato a 'deactivated'.
        await companyDocRef.update({ status: 'deactivated' });
        break;
      
      case 'setCredits':
        // Aggiorna solo il campo dei crediti.
        await companyDocRef.update({ credits: credits });
        break;

      // ===================================================================
      // --- CORREZIONE CHIAVE: Gestione dell'aggiornamento del nome ---
      // Questo blocco gestisce l'azione 'changeName' inviata dal frontend.
      case 'changeName':
        // Aggiorna specificamente e solo il campo companyName nel documento Firebase.
        await companyDocRef.update({
          companyName: companyName 
        });
        break;
      // ===================================================================

      default:
        // Se l'azione non corrisponde a nessuna delle precedenti, restituisce un errore.
        return res.status(400).json({ error: 'Azione non valida' });
    }

    res.status(200).json({ message: 'Operazione completata con successo.' });

  } catch (error) {
    console.error("Errore nell'API /api/activate-company:", error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
