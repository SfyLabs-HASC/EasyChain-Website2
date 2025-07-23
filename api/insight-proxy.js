// FILE: /api/insight-proxy.js
// VERSIONE DEFINITIVA: Utilizza le variabili d'ambiente di Vercel in modo sicuro.

export default async function handler(req, res) {
  // Accetta solo richieste di tipo GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Prende i parametri dalla richiesta del frontend
  const { contract_address, event_name, contributor } = req.query;

  // Validazione dei parametri essenziali
  if (!contract_address || !event_name || !contributor) {
    return res.status(400).json({ error: 'Parametri mancanti: contract_address, event_name, e contributor sono richiesti.' });
  }

  // Legge il Client ID dalle variabili d'ambiente di Vercel.
  // Questo è il modo corretto e sicuro.
  const clientId = process.env.THIRDWEB_CLIENT_ID;

  // Se la variabile non è impostata su Vercel, restituisce un errore chiaro.
  if (!clientId) {
    console.error("ERRORE CRITICO: La variabile d'ambiente THIRDWEB_CLIENT_ID non è impostata su Vercel.");
    return res.status(500).json({ error: 'Configurazione del server incompleta.' });
  }

  // Costruisce l'URL per l'API di Thirdweb Insight
  const insightUrl = `https://polygon.insight.thirdweb.com/v1/events`;
  const params = new URLSearchParams({
    contract_address,
    event_name,
    "filters[contributor]": contributor,
    order: "desc",
    limit: "100",
  });

  try {
    // Esegue la chiamata dal server, aggiungendo il Client ID in modo sicuro
    const response = await fetch(`${insightUrl}?${params.toString()}`, {
      method: 'GET',
      headers: {
        'x-thirdweb-client-id': clientId,
        'Content-Type': 'application/json'
      },
    });

    // Se la risposta da Insight non è OK, inoltra l'errore
    if (!response.ok) {
      const errorBody = await response.text();
      console.error("Errore da Thirdweb Insight:", errorBody);
      return res.status(response.status).json({ error: `Errore dall'API di Insight: ${response.statusText}` });
    }

    // Se la risposta è OK, inoltra i dati al frontend
    const data = await response.json();
    return res.status(200).json(data);

  } catch (error) {
    console.error("Errore nel proxy API Insight:", error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
