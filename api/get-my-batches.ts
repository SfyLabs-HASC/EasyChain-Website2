// FILE: api/get-my-batches.ts
// Questo endpoint replica la logica della tua pagina Admin.
// Riceve un indirizzo wallet, interroga Firebase con privilegi da admin e restituisce i dati.

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// --- Inizializzazione di Firebase Admin SDK ---
// Questo codice è sicuro perché viene eseguito solo sul server di Vercel.
function initializeFirebaseAdmin() {
  if (getApps().length > 0) {
    return; // Evita di inizializzare più volte
  }
  if (!process.env.FIREBASE_ADMIN_SDK_JSON) {
    throw new Error("La variabile d'ambiente FIREBASE_ADMIN_SDK_JSON non è impostata.");
  }
  const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_SDK_JSON);
  initializeApp({
    credential: cert(serviceAccount),
  });
}

// --- Funzione Principale (Handler) ---
export default async function handler(
  request: VercelRequest,
  response: VercelResponse
) {
  try {
    // Inizializza l'app di Firebase Admin
    initializeFirebaseAdmin();
    const db = getFirestore();

    // Prendiamo l'indirizzo del wallet dalla query string dell'URL
    // es. /api/get-my-batches?address=0x123...
    const { address } = request.query;

    if (!address || typeof address !== 'string') {
      return response.status(400).send({ error: 'Indirizzo wallet mancante o non valido.' });
    }

    // Interroghiamo Firestore per trovare tutti i documenti
    // che appartengono a questo indirizzo.
    const batchesRef = db.collection('batches');
    const snapshot = await batchesRef.where('ownerAddress', '==', address).get();

    if (snapshot.empty) {
      return response.status(200).json([]); // Restituisce un array vuoto se non trova nulla
    }

    // Mappiamo i dati in un formato pulito per il frontend
    const batchesData = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    return response.status(200).json(batchesData);

  } catch (error: any) {
    console.error("Errore nell'API /api/get-my-batches:", error.message);
    return response.status(500).send({ error: 'Errore interno del server.' });
  }
}