// Esempio di endpoint API in ambiente Node.js / Next.js
// FILE: /pages/api/check-status.js

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Inizializza Firebase Admin (solo se non già fatto)
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);

if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount),
  });
}

const db = getFirestore();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { walletAddress } = req.body;

  if (!walletAddress) {
    return res.status(400).json({ message: 'walletAddress è obbligatorio' });
  }

  try {
    // Cerca il documento dell'utente usando il suo indirizzo wallet come ID
    const userRef = db.collection('users').doc(walletAddress.toLowerCase());
    const docSnap = await userRef.get();

    // Se il documento non esiste
    if (!docSnap.exists) {
      return res.status(404).json({ message: 'Utente non trovato' });
    }

    const userData = docSnap.data();

    // Controlla il campo 'status'
    if (userData.status === 'active') {
      res.status(200).json({ status: 'active' });
    } else {
      res.status(200).json({ status: 'inactive' });
    }
  } catch (error) {
    console.error("Errore API Firebase:", error);
    res.status(500).json({ message: 'Errore interno del server' });
  }
}