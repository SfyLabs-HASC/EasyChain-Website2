// PERCORSO FILE: api/get-contract-events.ts (nella root del progetto)
// DESCRIZIONE: Versione definitiva. Risolve l'errore di serializzazione BigInt
// convertendo ricorsivamente tutti i BigInt in stringhe prima di inviare la risposta JSON.

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createThirdwebClient, getContract, getContractEvents } from 'thirdweb';
import { polygon } from 'thirdweb/chains';

const CONTRACT_ADDRESS = '0x0c5e6204e80e6fb3c0c7098c4fa84b2210358d0b';

/**
 * Funzione helper che attraversa un oggetto o un array e converte
 * tutti i valori di tipo BigInt in stringhe.
 * @param obj L'oggetto o l'array da processare.
 * @returns Un nuovo oggetto/array con i BigInt convertiti.
 */
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
        newObj[key] = serializeBigInts(value); // Chiamata ricorsiva per oggetti annidati
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

    // **LA CORREZIONE**
    // Prima di inviare la risposta, passiamo i dati alla nostra funzione helper
    // per convertire tutti i BigInt in stringhe.
    const serializableEvents = serializeBigInts(events);

    return res.status(200).json({ events: serializableEvents });

  } catch (error: any) {
    console.error('ERRORE SERVER durante l\'esecuzione della funzione API:', error);
    return res.status(500).json({ 
      error: 'Errore interno del server. Controllare i log della funzione su Vercel.',
      details: error.message 
    });
  }
}
