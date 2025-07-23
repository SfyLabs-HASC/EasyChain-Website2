// FILE: /api/insight-proxy.js
// VERSIONE DI TEST: Il Client ID è inserito direttamente per escludere problemi con le variabili d'ambiente.

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { contract_address, event_name, contributor } = req.query;

  if (!contract_address || !event_name || !contributor) {
    return res.status(400).json({ error: 'Parametri mancanti.' });
  }

  // --- PROVA DI DEBUG: Inseriamo il Client ID direttamente nel codice ---
  // Se questo funziona, il problema è al 100% nella configurazione delle variabili d'ambiente su Vercel.
  const clientId = "023dd6504a82409b2bc7cb971fd35b16";
  // --------------------------------------------------------------------

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
