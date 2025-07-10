export default async function handler(req, res) {
  const { address } = req.query;

  if (!address) {
    return res.status(400).json({ error: "Parametro 'address' mancante." });
  }

  const CLIENT_ID = process.env.THIRDWEB_CLIENT_ID;
  const SECRET_KEY = process.env.THIRDWEB_SECRET_KEY;

  if (!CLIENT_ID || !SECRET_KEY) {
    console.error("Client ID o Secret Key mancanti.");
    return res.status(500).json({ error: "Client ID o Secret Key mancanti." });
  }

  const CONTRACT_ADDRESS = "0x2bd72307a73cc7be3f275a81c8edbe775bb08f3e";
  const TOPIC0 = "0xdee773e2df2e7dd4c0e6656a2a6794ebd421a24525ff20b8cf9c01b1ac5a4186"; // evento initializeBatch
  const insightUrl = "https://polygon.insight.thirdweb.com/v1/events";

  const params = new URLSearchParams({
    contract_address: CONTRACT_ADDRESS,
    topic0: TOPIC0,
    limit: "1000",
  });

  const fullUrl = `${insightUrl}?${params.toString()}`;

  try {
    const response = await fetch(fullUrl, {
      method: "GET",
      headers: {
        "x-client-id": CLIENT_ID,
        Authorization: `Bearer ${SECRET_KEY}`,
        "Content-Type": "application/json",
      },
    });

    const raw = await response.text();
    let data;

    try {
      data = JSON.parse(raw);
    } catch (e) {
      console.error("Risposta Insight NON JSON:", raw);
      return res.status(500).json({ error: "Insight ha risposto in formato non valido." });
    }

    if (!response.ok) {
      console.error("Insight API error:", data);
      return res.status(response.status).json({ error: "Insight API error", details: data });
    }

    // Filtro eventi per indirizzo del contributor (se presente)
    const events = data.events?.filter((event) => {
      const contributor =
        event?.decoded?.contributor ||
        event?.data?.contributor ||
        event?.decoded?.args?.contributor;
      return contributor?.toLowerCase() === address.toLowerCase();
    }) || [];

    return res.status(200).json({ events });
  } catch (err) {
    console.error("Errore durante la chiamata a Insight:", err);
    return res.status(500).json({ error: "Errore interno del server." });
  }
}
