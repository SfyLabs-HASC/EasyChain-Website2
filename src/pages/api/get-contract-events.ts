// PERCORSO FILE: pages/api/get-contract-events.ts
// DESCRIZIONE: Questo è un nuovo endpoint API che viene eseguito solo sul server.
// Il suo scopo è chiamare in modo sicuro le API di thirdweb usando la secretKey
// e restituire i dati al componente frontend.

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
    // Questo è il punto chiave della sicurezza: la chiave non lascia mai il backend.
    const secretKey = process.env.THIRDWEB_SECRET_KEY;
    if (!secretKey) {
      // Se la chiave non è configurata sul server (es. su Vercel), restituiamo un errore.
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
    // L'SDK gestisce internamente la chiamata autenticata all'API di Insight.
    const events = await getContractEvents({
      contract,
      // Specifichiamo quale evento ci interessa per essere più efficienti
      eventName: 'BatchInitialized', 
    });

    // 4. Inviamo i dati degli eventi al frontend con successo.
    return res.status(200).json({ events });

  } catch (error: any) {
    // In caso di errore, lo logghiamo sul server per poterlo analizzare...
    console.error('Errore API nel recuperare gli eventi del contratto:', error);
    
    // ...e inviamo un messaggio di errore generico al client.
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
