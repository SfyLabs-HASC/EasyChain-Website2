// PERCORSO FILE: api/get-contract-events.ts
// DESCRIZIONE: Versione aggiornata che accetta un 'userAddress' come parametro
// e lo utilizza per filtrare gli eventi direttamente tramite l'SDK di thirdweb.

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createThirdwebClient, getContract, getContractEvents } from 'thirdweb';
import { polygon } from 'thirdweb/chains';

const CONTRACT_ADDRESS = '0x0c5e6204e80e6fb3c0c7098c4fa84b2210358d0b';

function serializeBigInts(obj: any): any {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => serializeBigInts(item));
  }
  const newObj: { [key: string]: any } = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key];
      if (typeof value === 'bigint') {
        newObj[key] = value.toString();
      } else if (typeof value === 'object') {
        newObj[key] = serializeBigInts(value);
      } else {
        newObj[key] = value;
      }
    }
  }
  return newObj;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    // --- MODIFICA 1: Leggere l'indirizzo dell'utente dalla richiesta ---
    const { userAddress } = req.query;

    // Se non viene fornito un indirizzo, non possiamo filtrare. Restituiamo un errore.
    if (!userAddress || typeof userAddress !== 'string') {
      return res.status(400).json({ error: "Il parametro 'userAddress' è obbligatorio." });
    }

    const secretKey = process.env.THIRDWEB_SECRET_KEY;
    if (!secretKey) {
      console.error('ERRORE SERVER: THIRDWEB_SECRET_KEY non trovata.');
      return res.status(500).json({ error: "Variabile d'ambiente del server mancante." });
    }
    
    const client = createThirdwebClient({ secretKey });

    const contract = getContract({
      client,
      chain: polygon,
      address: CONTRACT_ADDRESS,
    });

    // --- MODIFICA 2: Aggiungere il filtro alla chiamata getContractEvents ---
    // L'evento 'BatchInitialized' nel tuo contratto ha un parametro 'address' indicizzato
    // che possiamo usare per filtrare. Assicurati che il nome del parametro ('contributor') sia corretto.
    // Guardando il tuo index.html, il parametro si chiama 'contributor'.
    const events = await getContractEvents({
      contract,
      eventName: 'BatchInitialized', 
      filters: {
        // Filtra per l'indirizzo che ha emesso l'evento
        contributor: userAddress 
      }
    });

    const serializableEvents = serializeBigInts(events);

    return res.status(200).json({ events: serializableEvents });

  } catch (error: any) {
    console.error('ERRORE SERVER durante l\'esecuzione della funzione API:', error);
    return res.status(500).json({ 
      error: 'Errore interno del server.',
      details: error.message 
    });
  }
}
