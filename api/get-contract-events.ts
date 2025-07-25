// PERCORSO FILE: api/get-contract-events.ts (nella root del progetto)
// DESCRIZIONE: Versione corretta che utilizza i tipi di Vercel (@vercel/node)
// invece di quelli di Next.js, risolvendo l'errore 500 in un ambiente Vite.

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createThirdwebClient, getContract } from 'thirdweb';
import { polygon } from 'thirdweb/chains';
import { getContractEvents } from 'thirdweb/extensions/events';

// Indirizzo del tuo smart contract
const CONTRACT_ADDRESS = '0x0c5e6204e80e6fb3c0c7098c4fa84b2210358d0b';

// Definiamo un tipo per la risposta per maggiore chiarezza
type Data = {
  events?: any[];
  error?: string;
};

export default async function handler(
  req: VercelRequest, // <-- TIPO CORRETTO PER VITE/VERCEL
  res: VercelResponse // <-- TIPO CORRETTO PER VITE/VERCEL
) {
  // IMPORTANTE: Aggiungiamo gli header per il CORS per permettere al frontend di chiamare l'API
  // Questo è fondamentale in un ambiente serverless.
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Vercel gestisce le richieste OPTIONS automaticamente, ma è buona norma includerlo.
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Controllo di sicurezza: consentiamo solo richieste di tipo GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    // Leggiamo la secret key dalle variabili d'ambiente del server.
    const secretKey = process.env.THIRDWEB_SECRET_KEY;
    if (!secretKey) {
      // Restituiamo un errore JSON formattato correttamente
      return res.status(500).json({ error: "La variabile d'ambiente THIRDWEB_SECRET_KEY non è impostata sul server." });
    }

    // 1. Inizializziamo il client di thirdweb sul SERVER-SIDE.
    const client = createThirdwebClient({ secretKey });

    // 2. Otteniamo un riferimento allo smart contract.
    const contract = getContract({
      client,
      chain: polygon,
      address: CONTRACT_ADDRESS,
    });

    // 3. Recuperiamo TUTTI gli eventi 'BatchInitialized' dal contratto.
    const events = await getContractEvents({
      contract,
      eventName: 'BatchInitialized', 
    });

    // 4. Inviamo i dati degli eventi al frontend con successo.
    return res.status(200).json({ events });

  } catch (error: any) {
    // In caso di errore, lo logghiamo sul server per poterlo analizzare...
    console.error('Errore API nel recuperare gli eventi del contratto:', error);
    
    // ...e inviamo un messaggio di errore JSON al client.
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
