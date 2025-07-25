// PERCORSO FILE: api/get-contract-events.ts
// DESCRIZIONE: Versione finale che importa e utilizza l'ABI del contratto
// per abilitare il filtraggio e la decodifica corretta degli eventi.

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createThirdwebClient, getContract, getContractEvents } from 'thirdweb';
import { polygon } from 'thirdweb/chains';
// --- MODIFICA CHIAVE 1: Importare l'ABI dal nuovo file ---
import { supplyChainABI } from './abi';

const CONTRACT_ADDRESS = '0x0c5e6204e80e6fb3c0c7098c4fa84b2210358d0b';

function serializeBigInts(obj: any): any {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(item => serializeBigInts(item));
  const newObj: { [key: string]: any } = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key];
      if (typeof value === 'bigint') newObj[key] = value.toString();
      else if (typeof value === 'object') newObj[key] = serializeBigInts(value);
      else newObj[key] = value;
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

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: `Method ${req.method} Not Allowed` });

  try {
    const { userAddress } = req.query;
    if (!userAddress || typeof userAddress !== 'string') {
      return res.status(400).json({ error: "Il parametro 'userAddress' è obbligatorio." });
    }

    const secretKey = process.env.THIRDWEB_SECRET_KEY;
    if (!secretKey) {
      console.error('ERRORE SERVER: THIRDWEB_SECRET_KEY non trovata.');
      return res.status(500).json({ error: "Variabile d'ambiente del server mancante." });
    }
    
    const client = createThirdwebClient({ secretKey });

    // --- MODIFICA CHIAVE 2: Passare l'ABI a getContract ---
    const contract = getContract({
      client,
      chain: polygon,
      address: CONTRACT_ADDRESS,
      abi: supplyChainABI, // <-- L'ABI è ora fornito!
    });

    // Questo filtro ora funzionerà perché l'SDK sa che 'contributor' è un campo indicizzato
    const events = await getContractEvents({
      contract,
      eventName: 'BatchInitialized', 
      filters: {
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
