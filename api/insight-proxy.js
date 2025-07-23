// FILE: /api/insight-proxy.js
// VERSIONE CON LOG DI DEBUG per verificare la variabile d'ambiente.

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { contract_address, event_name, contributor } = req.query;

  if (!contract_address || !event_name || !contributor) {
    return res.status(400).json({ error: 'Parametri mancanti.' });
  }

  // --- TEST DI DEBUG ---
  // Leggiamo la variabile d'ambiente da Vercel.
  const clientId = process.env.THIRDWEB_CLIENT_ID;
  
  // Scriviamo nei log di Vercel il valore che abbiamo letto.
  console.log(`Valore di THIRDWEB_CLIENT_ID letto da Vercel: ${clientId}`);
  // --------------------

  if (!clientId) {
    console.error("ERRORE CRITICO: La variabile d'ambiente THIRDWEB_CLIENT_ID non è impostata o non è leggibile su Vercel.");
    return res.status(500).json({ error: 'Configurazione del server incompleta.' });
  }

  const insightUrl = `https://polygon.insight.thirdweb.com/v1/events`;
  const params = new URLSearchParams({
    contract_address,
    event_name,
    "filters[contributor]": contributor,
    order: "desc",
    limit: "100",
  });

  try {
    const response = await fetch(`${insightUrl}?${params.toString()}`, {
      method: 'GET',
      headers: {
        'x-thirdweb-client-id': clientId,
        'Content-Type': 'application/json'
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("Errore ricevuto da Thirdweb Insight:", errorBody);
      return res.status(response.status).json({ error: `Errore dall'API di Insight: ${response.statusText}` });
    }

    const data = await response.json();
    return res.status(200).json(data);

  } catch (error) {
    console.error("Errore nel proxy API Insight:", error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
