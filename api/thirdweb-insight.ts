export default async function handler(req, res) {
  const { address } = req.query;

  if (!address) {
    return res.status(400).json({ error: "Parametro 'address' mancante." });
  }

  if (!process.env.THIRDWEB_SECRET_KEY) {
    console.error("THIRDWEB_SECRET_KEY non definita.");
    return res.status(500).json({ error: "Chiave segreta mancante." });
  }

  // Dati del contratto
  const CONTRACT_ADDRESS = "0x2bd72307a73cc7be3f275a81c8edbe775bb08f3e";

  // Hash dell'evento BatchInitialized(address,uint256,string,string,string,string,string,string,bool)
  const TOPIC0 = "0xdee773e2df2e7dd4c0e6656a2a6794ebd421a24525ff20b8cf9c01b1ac5a4186";

  // Costruisci la query
  const insightUrl = "https://polygon.insight.thirdweb.com/v1/events";

  const params = new URLSearchParams({
    contract_address: CONTRACT_ADDRESS,
    topic0: TOPIC0,
    topic1: address.toLowerCase(), // filtriamo già per contributor!
    limit: "1000",
  });

  try {
    const response = await fetch(`${insightUrl}?${params.toString()}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${process.env.THIRDWEB_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Errore Insight:", data);
      return res.status(response.status).json({
        error: "Insight API error",
        details: data,
      });
    }

    return res.status(200).json({ events: data.events });
  } catch (error) {
    console.error("Errore server:", error);
    return res.status(500).json({ error: "Errore interno del server." });
  }
}
