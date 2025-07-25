// PERCORSO FILE: api/get-contract-events.ts (nella root del progetto)
// DESCRIZIONE: Versione con logging di diagnostica per identificare il punto di crash.

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createThirdwebClient, getContract } from 'thirdweb';
import { polygon } from 'thirdweb/chains';
import { getContractEvents } from 'thirdweb/extensions/events';

const CONTRACT_ADDRESS = '0x0c5e6204e80e6fb3c0c7098c4fa84b2210358d0b';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Imposta gli header CORS per ogni richiesta
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  console.log('[API LOG] Funzione avviata.');

  try {
    const secretKey = process.env.THIRDWEB_SECRET_KEY;
    if (!secretKey) {
      console.error('[API LOG] ERRORE: THIRDWEB_SECRET_KEY non trovata!');
      return res.status(500).json({ error: "La variabile d'ambiente THIRDWEB_SECRET_KEY non è impostata sul server." });
    }
    console.log('[API LOG] Secret Key trovata. Inizializzazione del client...');
    
    const client = createThirdwebClient({ secretKey });
    console.log('[API LOG] Client thirdweb inizializzato con successo.');

    const contract = getContract({
      client,
      chain: polygon,
      address: CONTRACT_ADDRESS,
    });
    console.log('[API LOG] Riferimento al contratto ottenuto con successo.');

    const events = await getContractEvents({
      contract,
      eventName: 'BatchInitialized', 
    });
    console.log(`[API LOG] Eventi recuperati con successo: ${events.length} eventi trovati.`);

    return res.status(200).json({ events });

  } catch (error: any) {
    console.error('[API LOG] CRASH DENTRO IL BLOCCO CATCH:', error);
    return res.status(500).json({ 
      error: 'Errore interno del server. Controllare i log della funzione su Vercel.',
      details: error.message 
    });
  }
}
