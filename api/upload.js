// File: /api/upload.js (Versione Finale con Cartelle per Azienda)

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
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
      console.error("Errore: Variabili d'ambiente di Filebase non trovate!");
      return res.status(500).json({ error: "Configurazione del server errata." });
  }

  try {
    const form = formidable({});
    const [fields, files] = await form.parse(req);

    const file = files.file?.[0];
    if (!file) {
      return res.status(400).json({ error: "Nessun file ricevuto." });
    }

    // --- 1. RICEZIONE E PULIZIA DEL NOME AZIENDA ---
    // Riceve il nome dell'azienda inviato dal frontend.
    const companyName = fields.companyName?.[0] || 'AziendaGenerica';
    
    // "Pulisce" il nome per renderlo un nome di cartella valido:
    // - Sostituisce spazi e caratteri speciali con un trattino
    // - Rimuove tutto ciò che non è una lettera, un numero o un trattino
    const folderName = companyName.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '');

    // --- 2. CREAZIONE DEL PERCORSO COMPLETO (KEY) ---
    // Crea il percorso completo: nome-cartella/timestamp_nomefile.ext
    const objectKey = `${folderName}/${Date.now()}_${file.originalFilename}`;

    const fileContent = fs.readFileSync(file.filepath);

    const putCommand = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: objectKey, // Usa il percorso completo con la "cartella"
      Body: fileContent,
      ContentType: file.mimetype,
    });

    const putResult = await s3Client.send(putCommand);
    const cid = putResult.ETag?.replace(/"/g, '');

    if (!cid) {
        throw new Error("Impossibile ottenere il CID da Filebase.");
    }
    
    fs.unlinkSync(file.filepath);

    console.log(`Upload completato per ${companyName}. Percorso: ${objectKey}. CID: ${cid}`);
    return res.status(200).json({ cid: cid });

  } catch (error) {
    console.error('Errore durante l'upload:', error);
    return res.status(500).json({ error: 'Upload del file fallito.', details: error.message });
  }
}