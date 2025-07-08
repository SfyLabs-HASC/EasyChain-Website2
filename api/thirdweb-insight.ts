// pages/api/thirdweb-insight.ts

export default async function handler(req, res) {
  const { address } = req.query;

  if (!address) {
    return res.status(400).json({ error: "Missing address parameter." });
  }

  // Controlla che la Secret Key sia impostata nelle variabili d'ambiente
  if (!process.env.THIRDWEB_SECRET_KEY) {
    return res.status(500).json({ error: "Secret Key non configurata sul server." });
  }

  const CONTRACT_ADDRESS = "0x2bd72307a73cc7be3f275a81c8edbe775bb08f3e";
  const insightUrl = `https://polygon.insight.thirdweb.com/v1/events/${CONTRACT_ADDRESS}`;
  
  const params = new URLSearchParams({
    chain_id: "137",
    filter_address: address as string,
    limit: "1000",
  });

  try {
    const response = await fetch(`${insightUrl}?${params.toString()}`, {
      method: "GET",
      headers: {
        // MODIFICA CRUCIALE: Usa la Secret Key per l'autenticazione server-to-server
        "Authorization": `Bearer ${process.env.THIRDWEB_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    if (!response.ok) {
        // Se la risposta non è ok, inoltra l'errore da Thirdweb
        return res.status(response.status).json(data);
    }
    
    res.status(200).json(data);

  } catch (error) {
    console.error("Insight API proxy error:", error);
    res.status(500).json({ error: "Internal server error." });
  }
}