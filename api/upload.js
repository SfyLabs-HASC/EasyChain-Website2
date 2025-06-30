// VERSIONE FINALE - NOME FILE BASATO SUL TITOLO ISCRIZIONE

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { formidable } from 'formidable';
import fs from 'fs';
import path from 'path'; // Importiamo il modulo 'path' per gestire le estensioni dei file

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
    console.error("ERRORE FATALE: Variabili d'ambiente non caricate.");
    return res.status(500).json({ error: "Configurazione del server errata." });
  }

  try {
    const form = formidable({});
    const [fields, files] = await form.parse(req);

    const file = files.file?.[0];
    if (!file) {
      return res.status(400).json({ error: "Nessun file ricevuto." });
    }

    // --- LOGICA AGGIORNATA PER IL NOME FILE ---

    // 1. Riceviamo il titolo e il nome dell'azienda
    const companyName = fields.companyName?.[0] || 'AziendaGenerica';
    const inscriptionTitle = fields.inscriptionTitle?.[0]; // <-- Riceviamo il nuovo campo
    
    // 2. "Puliamo" i nomi per creare percorsi validi
    const folderName = companyName.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '');
    const sanitizedTitle = inscriptionTitle
        ? inscriptionTitle.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '')
        : 'file_senza_titolo'; // Fallback se il titolo non arriva

    // 3. Estraiamo l'estensione originale del file
    const fileExtension = path.extname(file.originalFilename);

    // 4. Costruiamo il nuovo nome del file
    // Per evitare sovrascritture, aggiungiamo un timestamp prima del titolo.
    const finalFileName = `${Date.now()}_${sanitizedTitle}${fileExtension}`;
    const objectKey = `${folderName}/${finalFileName}`;
    
    // --- FINE LOGICA AGGIORNATA ---

    const fileContent = fs.readFileSync(file.filepath);

    const putCommand = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: objectKey,
      Body: fileContent,
      ContentType: file.mimetype,
    });

    const putResult = await s3Client.send(putCommand);
    const cid = putResult.ETag?.replace(/"/g, '');

    if (!cid) {
      throw new Error("CID non trovato nella risposta di Filebase.");
    }
    
    fs.unlinkSync(file.filepath);

    console.log(`Upload completato per ${companyName}. Percorso: ${objectKey}. CID: ${cid}`);
    return res.status(200).json({ cid: cid });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('ERRORE CRITICO DURANTE L\'UPLOAD:', errorMessage);
    return res.status(500).json({ error: 'Upload del file fallito.', details: errorMessage });
  }
}