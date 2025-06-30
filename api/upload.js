// VERSIONE CORRETTA E TESTATA - 30/06/2025

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
    console.error("ERRORE FATALE: Le variabili d'ambiente di Filebase non sono state caricate dal server di Vercel.");
    return res.status(500).json({ error: "Configurazione del server errata. Controllare le variabili d'ambiente su Vercel." });
  }

  try {
    const form = formidable({});
    const [fields, files] = await form.parse(req);

    const file = files.file?.[0];
    if (!file) {
      return res.status(400).json({ error: "Nessun file ricevuto dal frontend." });
    }

    const companyName = fields.companyName?.[0] || 'AziendaGenerica';
    const folderName = companyName.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '');
    const objectKey = `${folderName}/${Date.now()}_${file.originalFilename}`;
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
      throw new Error("CID non trovato nella risposta di Filebase dopo l'upload.");
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