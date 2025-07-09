// FILE: /pages/api/thirdweb-insight.ts

import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // 1. Controllo della chiave segreta
  if (!process.env.THIRDWEB_SECRET_KEY) {
    console.error("❌ THIRDWEB_SECRET_KEY non è configurata.");
    return res.status(500).json({ error: "Configurazione del server incompleta." });
  }

  // 2. Controllo dell'indirizzo passato nella query
  const { address } = req.query;
  if (!address || typeof address !== "string") {
    return res.status(400).json({ error: "Parametro 'address' mancante o non valido." });
  }

  // 3. Dati di configurazione
  const CONTRACT_ADDRESS = "0x2bd72307a73cc7be3f275a81c8edbe775bb08f3e";
  const EVENT_SIGNATURE = "BatchInitialized(address,uint256,string,string,string,string,string,string,bool)";
  const BASE_URL = `https://polygon.insight.thirdweb.com/v1/events`;

  const params = new URLSearchParams({
    contract_address: CONTRACT_ADDRESS,
    event_signature: EVENT_SIGNATURE,
    "filters[contributor]": address,
    limit: "1000",
  });

  const fullUrl = `${BASE_URL}?${params.toString()}`;
  console.log("ℹ️ Insight URL chiamata:", fullUrl);

  try {
    // 4. Chiamata API verso Insight
    const response = await fetch(fullUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${process.env.THIRDWEB_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
    });

    // 5. Tentativo di parsing JSON (o fallback a raw text)
    let data: any;
    try {
      data = await response.json();
    } catch (parseError) {
      const raw = await response.text();
      console.error("❌ Errore parsing JSON dalla risposta Insight:", raw);
      return res.status(500).json({
        error: "Errore parsing JSON dalla risposta Insight.",
        raw,
      });
    }

    // 6. Se Insight risponde con errore (es. evento non trovato)
    if (!response.ok) {
      console.error("❌ Errore dall'API Insight:", data);
      return res.status(response.status).json(data);
    }

    // 7. Tutto OK
    return res.status(200).json(data);
  } catch (error: any) {
    console.error("❌ Errore generico nella chiamata Insight:", error);
    return res.status(500).json({ error: "Errore interno del server." });
  }
}
