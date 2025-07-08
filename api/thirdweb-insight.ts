// FILE: /pages/api/thirdweb-insight.ts
import { decodeEventLog } from "thirdweb";

// Definiamo qui solo la parte di ABI che ci serve, rendendo il file indipendente
const batchInitializedEventAbi = {
  "anonymous": false,
  "inputs": [
    { "indexed": true, "internalType": "address", "name": "contributor", "type": "address" },
    { "indexed": true, "internalType": "uint256", "name": "batchId", "type": "uint256" },
    { "indexed": false, "internalType": "string", "name": "name", "type": "string" },
    { "indexed": false, "internalType": "string", "name": "description", "type": "string" },
    { "indexed": false, "internalType": "string", "name": "date", "type": "string" },
    { "indexed": false, "internalType": "string", "name": "location", "type": "string" },
    { "indexed": false, "internalType": "string", "name": "imageIpfsHash", "type": "string" },
    { "indexed": false, "internalType": "string", "name": "contributorName", "type": "string" },
    { "indexed": false, "internalType": "bool", "name": "isClosed", "type": "bool" }
  ],
  "name": "BatchInitialized",
  "type": "event"
};


export default async function handler(req, res) {
  if (!process.env.THIRDWEB_CLIENT_ID) {
    console.error("THIRDWEB_CLIENT_ID non è configurata.");
    return res.status(500).json({ error: "Configurazione del server incompleta." });
  }

  const { address } = req.query;
  if (!address) {
    return res.status(400).json({ error: "Parametro 'address' mancante." });
  }

  const CONTRACT_ADDRESS = "0x2bd72307a73cc7be3f275a81c8edbe775bb08f3e";
  const insightUrl = `https://polygon.insight.thirdweb.com/v1/events`;
  
  const params = new URLSearchParams({
    contract_address: CONTRACT_ADDRESS,
    event_signature: "BatchInitialized(address,uint256,string,string,string,string,string,string,bool)",
    "filters[contributor]": address as string,
    limit: "1000",
  });

  try {
    const apiResponse = await fetch(`${insightUrl}?${params.toString()}`, {
      method: 'GET',
      headers: {
        "x-thirdweb-client-id": process.env.THIRDWEB_CLIENT_ID,
        "Content-Type": "application/json",
      },
    });

    const data = await apiResponse.json();

    if (!apiResponse.ok) {
      console.error("Errore dall'API di Thirdweb:", data);
      return res.status(apiResponse.status).json(data);
    }
    
    const decodedEvents = data.result.map((event: any) => {
        const decodedLog = decodeEventLog({
            event: batchInitializedEventAbi,
            data: event.data,
            topics: event.topics,
        });
        return decodedLog.args;
    });

    res.status(200).json(decodedEvents);

  } catch (error) {
    console.error("Errore nel proxy API di Insight:", error);
    res.status(500).json({ error: "Errore interno del server." });
  }
}