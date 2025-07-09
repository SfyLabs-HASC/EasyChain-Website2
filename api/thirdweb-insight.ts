// FILE: /pages/api/thirdweb-insight.ts

export default async function handler(req, res) {
  // Controlla che la Secret Key sia impostata nelle variabili d'ambiente di Vercel
  if (!process.env.THIRDWEB_SECRET_KEY) {
    console.error("THIRDWEB_SECRET_KEY non è configurata.");
    return res.status(500).json({ error: "Configurazione del server incompleta." });
  }

  // Prende l'indirizzo del wallet dalla richiesta del frontend
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
    // Il nostro backend chiama l'API di Thirdweb usando la Secret Key
    const response = await fetch(`${insightUrl}?${params.toString()}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${process.env.THIRDWEB_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    // Se la risposta non è OK, inoltra l'errore
    if (!response.ok) {
      console.error("Errore dall'API di Thirdweb:", data);
      return res.status(response.status).json(data);
    }
    
    // Inoltra la risposta di successo al frontend
    res.status(200).json(data);

  } catch (error) {
    console.error("Errore nel proxy API di Insight:", error);
    res.status(500).json({ error: "Errore interno del server." });
  }
}