// PERCORSO FILE: api/get-contract-events.ts (nella root del progetto)
// DESCRIZIONE: Versione definitiva. Risolve l'errore ERR_MODULE_NOT_FOUND
// importando getContractEvents dal pacchetto principale 'thirdweb'.

import type { VercelRequest, VercelResponse } from '@vercel/node';
// Modifica Chiave: Importiamo tutto dal pacchetto principale 'thirdweb'
import { createThirdwebClient, getContract, getContractEvents } from 'thirdweb';
import { polygon } from 'thirdweb/chains';

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

  try {
    const secretKey = process.env.THIRDWEB_SECRET_KEY;
    if (!secretKey) {
      console.error('ERRORE SERVER: THIRDWEB_SECRET_KEY non trovata nelle variabili d\'ambiente.');
      return res.status(500).json({ error: "La variabile d'ambiente THIRDWEB_SECRET_KEY non è impostata sul server." });
    }
    
    const client = createThirdwebClient({ secretKey });

    const contract = getContract({
      client,
      chain: polygon,
      address: CONTRACT_ADDRESS,
    });

    const events = await getContractEvents({
      contract,
      eventName: 'BatchInitialized', 
    });

    return res.status(200).json({ events });

  } catch (error: any) {
    console.error('ERRORE SERVER durante l\'esecuzione della funzione API:', error);
    return res.status(500).json({ 
      error: 'Errore interno del server. Controllare i log della funzione su Vercel.',
      details: error.message 
    });
  }
}
