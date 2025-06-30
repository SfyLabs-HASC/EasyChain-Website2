// FILE: /api/upload.js (VERSIONE CORRETTA CON LOGICA PUT + HEAD)

import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { formidable } from 'formidable';
import fs from 'fs';

export const config = {
  api: {
    bodyParser: false,
  },
};

const s3Client = new S3Client({
  endpoint: "https://s3.filebase.com",
  region: "us-east-1",
  credentials: {
    accessKeyId: process.env.FILEBASE_ACCESS_KEY,
    secretAccessKey: process.env.FILEBASE_SECRET_KEY,
  },
});

const BUCKET_NAME = process.env.FILEBASE_BUCKET_NAME;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  if (!process.env.FILEBASE_ACCESS_KEY || !process.env.FILEBASE_BUCKET_NAME) {
    console.error("ERRORE FATALE: Le variabili d'ambiente di Filebase non sono state caricate.");
    return res.status(500).json({ error: "Configurazione del server errata." });
  }

  try {
    const form = formidable({});
    const [fields, files] = await form.parse(req);

    const file = files.file?.[0];
    if (!file) {
      return res.status(400).json({ error: "Nessun file ricevuto." });
    }

    const companyName = fields.companyName?.[0] || 'AziendaGenerica';
    const folderName = companyName.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '');
    const objectKey = `${folderName}/${Date.now()}_${file.originalFilename}`;
    const fileContent = fs.readFileSync(file.filepath);

    // --- FASE 1: UPLOAD DEL FILE (PUT) ---
    const putCommand = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: objectKey,
      Body: fileContent,
      ContentType: file.mimetype,
    });
    await s3Client.send(putCommand);

    // --- FASE 2: RICHIESTA DEI METADATI PER OTTENERE IL CID (HEAD) ---
    // Questo è il passaggio cruciale raccomandato da Filebase
    const headCommand = new HeadObjectCommand({
      Bucket: BUCKET_NAME,
      Key: objectKey,
    });
    const headResult = await s3Client.send(headCommand);

    // --- FASE 3: ESTRAZIONE DEL CID CORRETTO ---
    // Il vero CID IPFS si trova nei metadati della risposta HEAD
    const cid = headResult.Metadata?.cid;

    if (!cid) {
      // Se per qualche motivo il CID non fosse nei metadati, generiamo un errore chiaro
      console.error("CID non trovato nei metadati di Filebase. Risposta HEAD:", headResult);
      throw new Error("Impossibile recuperare il CID IPFS da Filebase dopo l'upload.");
    }
    
    fs.unlinkSync(file.filepath);

    console.log(`Upload completato. Percorso: ${objectKey}. CID IPFS corretto: ${cid}`);
    return res.status(200).json({ cid: cid });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('ERRORE CRITICO DURANTE L\'UPLOAD:', errorMessage);
    return res.status(500).json({ error: 'Upload del file fallito.', details: errorMessage });
  }
}