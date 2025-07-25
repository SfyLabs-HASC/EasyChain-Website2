// PERCORSO FILE: api/get-contract-events.ts (nella root del progetto)
// DESCRIZIONE: Questo è l'endpoint API per un progetto Vite su Vercel.
// Viene eseguito solo sul server e chiama in modo sicuro le API di thirdweb.

// Nota: A seconda della configurazione di Vercel, potresti dover usare
// l'import `import { VercelRequest, VercelResponse } from '@vercel/node';`
// al posto di quello di Next.js, ma per ora proviamo con questo.
import type { NextApiRequest, NextApiResponse } from 'next';
import { createThirdwebClient, getContract } from 'thirdweb';
import { polygon } from 'thirdweb/chains';
import { getContractEvents } from 'thirdweb/extensions/events';

// Indirizzo del tuo smart contract
const CONTRACT_ADDRESS = '0x0c5e6204e80e6fb3c0c7098c4fa84b2210358d0b';

// Definiamo un tipo per la risposta per maggiore chiarezza
type Data = {
  events?: any[]; // Idealmente, definire un tipo più specifico per gli eventi
  error?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  // Controllo di sicurezza: consentiamo solo richieste di tipo GET
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    // Leggiamo la secret key dalle variabili d'ambiente del server.
    const secretKey = process.env.THIRDWEB_SECRET_KEY;
    if (!secretKey) {
      throw new Error("La variabile d'ambiente THIRDWEB_SECRET_KEY non è impostata sul server.");
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

    // IMPORTANTE: Aggiungiamo gli header per il CORS per permettere al frontend di chiamare l'API
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Se la richiesta è di tipo OPTIONS (preflight), rispondiamo subito con 204
    if (req.method === 'OPTIONS') {
        return res.status(204).end();
    }

    // 4. Inviamo i dati degli eventi al frontend con successo.
    return res.status(200).json({ events });

  } catch (error: any) {
    console.error('Errore API nel recuperare gli eventi del contratto:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
