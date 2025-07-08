// FILE: /pages/api/thirdweb-insight.ts

export default async function handler(req, res) {
  // Controlla che la Secret Key sia impostata
  if (!process.env.THIRDWEB_SECRET_KEY) {
    console.error("THIRDWEB_SECRET_KEY non è configurata.");
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
      headers: {
        "Authorization": `Bearer ${process.env.THIRDWEB_SECRET_KEY}`,
      },
    });

    const data = await apiResponse.json();

    if (!apiResponse.ok) {
      console.error("Errore dall'API di Thirdweb:", data);
      return res.status(apiResponse.status).json(data);
    }
    
    // Inoltriamo i dati grezzi (data.result) così come sono
    res.status(200).json(data.result);

  } catch (error) {
    console.error("Errore nel proxy API di Insight:", error);
    res.status(500).json({ error: "Errore interno del server." });
  }
}