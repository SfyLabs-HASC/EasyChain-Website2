// FILE: /pages/api/thirdweb-insight.ts
import { decodeEventLog } from "thirdweb";
import { supplyChainABI as abi } from "../../src/abi/contractABI";

export default async function handler(req, res) {
  // Ora il backend usa il CLIENT_ID, preso dalle variabili d'ambiente
  if (!process.env.THIRDWEB_CLIENT_ID) {
    return res.status(500).json({ error: "Configurazione del server incompleta: THIRDWEB_CLIENT_ID mancante." });
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
        // MODIFICA CRUCIALE: Usiamo il Client ID come richiesto dall'errore
        "x-thirdweb-client-id": process.env.THIRDWEB_CLIENT_ID,
        "Content-Type": "application/json",
      },
    });

    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      console.error("Errore ricevuto dall'API di Thirdweb:", errorText);
      return res.status(apiResponse.status).json({ error: `API Error: ${errorText}` });
    }
    
    const data = await apiResponse.json();
    
    const batchInitializedEventAbi = abi.find(item => item.type === 'event' && item.name === 'BatchInitialized');
    if (!batchInitializedEventAbi) {
      throw new Error("ABI for BatchInitialized not found.");
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