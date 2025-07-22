// FILE: /api/activate-company.js
// VERSIONE CORRETTA: Gestisce correttamente le diverse collezioni (pending vs active).

import admin from 'firebase-admin';

// --- Funzione per inizializzare Firebase Admin in modo sicuro ---
function initializeFirebaseAdmin() {
  if (!admin.apps.length) {
    try {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
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
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { action, walletAddress, companyName, credits } = req.body;

  if (!action || !walletAddress) {
    return res.status(400).json({ error: 'Azione e indirizzo wallet sono obbligatori.' });
  }

  try {
    // Usa uno switch per eseguire l'operazione corretta in base all'azione ricevuta
    switch (action) {
      
      // ===================================================================
      // --- CORREZIONE CHIAVE: Logica per 'activate' e 'reactivate' ---
      case 'activate':
      case 'reactivate': { // Usiamo le parentesi graffe per creare uno scope locale
        
        // Per l'attivazione, i dati originali sono in 'pendingCompanies'
        const pendingDocRef = db.collection('pendingCompanies').doc(walletAddress);
        const activeDocRef = db.collection('activeCompanies').doc(walletAddress);
        
        const pendingDoc = await pendingDocRef.get();
        let originalData = {};

        if (pendingDoc.exists) {
            originalData = pendingDoc.data();
        } else {
            // Se non è in pending, potrebbe essere una riattivazione di un account già esistente
            console.log(`Documento non trovato in pending, si assume una riattivazione per ${walletAddress}`);
        }

        // Crea/aggiorna il documento nella collezione 'activeCompanies'
        await activeDocRef.set({
          ...originalData, // Mantiene i dati originali (email, social, etc.)
          companyName: companyName, // Usa il nome (potenzialmente aggiornato) dal modale
          credits: credits,
          status: 'active',
          activatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });

        // Se il documento esisteva in 'pending', eliminalo per completare lo "spostamento"
        if (pendingDoc.exists) {
            await pendingDocRef.delete();
        }

        break;
      }
      // ===================================================================

      case 'deactivate': {
        const docRef = db.collection('activeCompanies').doc(walletAddress);
        await docRef.update({ status: 'deactivated' });
        break;
      }
      
      case 'setCredits': {
        const docRef = db.collection('activeCompanies').doc(walletAddress);
        await docRef.update({ credits: credits });
        break;
      }

      case 'changeName': {
        // Quando si cambia il nome, l'azienda dovrebbe essere già attiva
        const docRef = db.collection('activeCompanies').doc(walletAddress);
        await docRef.update({ companyName: companyName });
        break;
      }

      default:
        return res.status(400).json({ error: 'Azione non valida' });
    }

    res.status(200).json({ message: 'Operazione completata con successo.' });

  } catch (error) {
    console.error("Errore nell'API /api/activate-company:", error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
