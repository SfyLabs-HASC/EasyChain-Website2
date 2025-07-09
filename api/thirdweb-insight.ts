export default async function handler(req, res) {
  const { address } = req.query;

  if (!address) {
    return res.status(400).json({ error: "Parametro 'address' mancante." });
  }

  if (!process.env.THIRDWEB_SECRET_KEY) {
    console.error("THIRDWEB_SECRET_KEY non definita.");
    return res.status(500).json({ error: "Chiave segreta mancante." });
  }

  const CONTRACT_ADDRESS = "0x2bd72307a73cc7be3f275a81c8edbe775bb08f3e";
  const TOPIC0 = "0xdee773e2df2e7dd4c0e6656a2a6794ebd421a24525ff20b8cf9c01b1ac5a4186"; // hash dell'evento
  const insightUrl = "https://polygon.insight.thirdweb.com/v1/events";

  const params = new URLSearchParams({
    contract_address: CONTRACT_ADDRESS,
    topic0: TOPIC0,
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
      return res.status(response.status).json({ error: "Insight API error", details: data });
    }

    // Filtro eventi per address (se presente in contributor)
    const events = data.events?.filter((event) => {
      const contributor = event?.decoded?.contributor || event?.data?.contributor;
      return contributor?.toLowerCase() === address.toLowerCase();
    }) || [];

    return res.status(200).json({ events });
  } catch (error) {
    console.error("Errore server:", error);
    return res.status(500).json({ error: "Errore interno del server." });
  }
}
