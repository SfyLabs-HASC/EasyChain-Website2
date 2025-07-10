// server.js
import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3001; // Puoi cambiarlo se vuoi

app.get("/api/thirdweb-insight", async (req, res) => {
  const { address } = req.query;

  if (!address) {
    return res.status(400).json({ error: "Parametro 'address' mancante." });
  }

  if (!process.env.THIRDWEB_CLIENT_ID) {
    console.error("THIRDWEB_CLIENT_ID mancante.");
    return res.status(500).json({ error: "Client ID mancante." });
  }

  const CONTRACT_ADDRESS = "0x2bd72307a73cc7be3f275a81c8edbe775bb08f3e";
  const TOPIC0 = "0xdee773e2df2e7dd4c0e6656a2a6794ebd421a24525ff20b8cf9c01b1ac5a4186";
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
        "x-client-id": process.env.THIRDWEB_CLIENT_ID,
        "Content-Type": "application/json",
      },
    });

    const text = await response.text();
    let data;

    try {
      data = JSON.parse(text);
    } catch {
      console.error("Risposta Insight non JSON:", text);
      return res.status(500).json({ error: "Insight ha risposto in formato non valido." });
    }

    if (!response.ok) {
      console.error("Errore Insight API:", data);
      return res.status(response.status).json({ error: "Insight API error", details: data });
    }

    const events = data.events?.filter((event) => {
      const contributor = event?.decoded?.contributor || event?.data?.contributor;
      return contributor?.toLowerCase() === address.toLowerCase();
    }) || [];

    res.status(200).json({ events });
  } catch (error) {
    console.error("Errore server:", error);
    res.status(500).json({ error: "Errore interno del server." });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server API listening on http://localhost:${PORT}/api/thirdweb-insight`);
});
