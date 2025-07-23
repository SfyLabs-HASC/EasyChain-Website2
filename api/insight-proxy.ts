// src/pages/api/insight-proxy.ts

import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const contributor = req.query.contributor as string;

  if (!contributor) {
    return res.status(400).json({ error: "Missing contributor address" });
  }

  const url = new URL("https://polygon.insight.thirdweb.com/v1/events");
  url.searchParams.append("contract_address", "0xd0bad36896df719b26683e973f2fc6135f215d4e");
  url.searchParams.append("event_name", "BatchInitialized");
  url.searchParams.append("filters[contributor]", contributor);
  url.searchParams.append("order", "desc");
  url.searchParams.append("limit", "100");

  try {
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "x-thirdweb-client-id": "023dd6504a82409b2bc7cb971fd35b16",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ error: errorText });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    console.error("Errore nella fetch verso Insight:", error);
    return res.status(500).json({ error: "Errore nel recupero dati da Insight" });
  }
}
