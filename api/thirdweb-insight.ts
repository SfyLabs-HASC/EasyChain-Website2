// FILE: /pages/api/thirdweb-insight.ts
export default async function handler(req, res) {
  const { address } = req.query;

  if (!process.env.THIRDWEB_SECRET_KEY) {
    return res.status(500).json({ error: "Variabile d'ambiente THIRDWEB_SECRET_KEY non trovata." });
  }
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
      return res.status(apiResponse.status).json(data);
    }
    
    // Inoltriamo i dati grezzi (data.result) al frontend, che si occuperà di decodificarli
    res.status(200).json(data.result);

  } catch (error) {
    console.error("Errore nel proxy API:", error);
    res.status(500).json({ error: "Errore interno del server proxy." });
  }
}