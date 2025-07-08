// pages/api/thirdweb-insight.ts

export default async function handler(req, res) {
  const { address } = req.query;

  if (!address) {
    return res.status(400).json({ error: "Missing address parameter." });
  }

  const CONTRACT_ADDRESS = "0x2bd72307a73cc7be3f275a81c8edbe775bb08f3e";
  const insightUrl = `https://polygon.insight.thirdweb.com/v1/events/${CONTRACT_ADDRESS}`;

  const params = new URLSearchParams({
    chain_id: "137", // Polygon chain id
    filter_address: address,
    limit: "1000",
  });

  try {
    const response = await fetch(`${insightUrl}?${params.toString()}`, {
      headers: {
        "x-thirdweb-client-id": process.env.THIRDWEB_CLIENT_ID,
      },
    });

    const textData = await response.text();

    // Passa direttamente il body così com'è, può essere JSON o testo in caso di errore
    res.status(response.status).send(textData);
  } catch (error) {
    console.error("Insight API error:", error);
    res.status(500).json({ error: "Internal server error." });
  }
}
