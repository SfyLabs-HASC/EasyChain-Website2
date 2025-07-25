// FILE: api/get-company-status.js
// DESCRIZIONE: Questo endpoint controlla lo stato di un'azienda
// interrogando la collezione 'activeCompanies' su Firestore.

import admin from 'firebase-admin';

// Funzione helper per inizializzare Firebase Admin in modo sicuro una sola volta
function initializeFirebaseAdmin() {
  if (!admin.apps.length) {
    try {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          // Assicura che le newline nella chiave privata siano gestite correttamente
          privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
        }),
      });
    } catch (error) {
      console.error('Firebase admin initialization error', error);
    }
  }
  return admin.firestore();
}

const db = initializeFirebaseAdmin();

export default async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { walletAddress } = req.query;

  if (!walletAddress || typeof walletAddress !== 'string') {
    return res.status(400).json({ error: "Il parametro 'walletAddress' è obbligatorio." });
  }

  try {
    // Cerca un documento nella collezione 'activeCompanies' che abbia come ID il walletAddress
    const companyRef = db.collection('activeCompanies').doc(walletAddress);
    const doc = await companyRef.get();

    // Se il documento non esiste, l'azienda non è attiva
    if (!doc.exists) {
      return res.status(200).json({ isActive: false });
    }

    // Se il documento esiste, l'azienda è attiva. Restituisci i suoi dati.
    const companyData = doc.data();
    res.status(200).json({
      isActive: true,
      companyName: companyData?.companyName || 'Nome non trovato',
      credits: companyData?.credits !== undefined ? companyData.credits : 0,
    });

  } catch (error) {
    console.error("Errore durante la verifica su Firebase:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
