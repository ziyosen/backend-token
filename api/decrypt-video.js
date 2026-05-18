import axios from "axios";

export default async function handler(req, res) {
  // Aktifkan CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // Ambil parameter URL terenkripsi dari query string
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ status: false, error: "Missing 'url' parameter" });
  }

  try {
    // 1. Download file video terenkripsi (.encrypt.mp4) sebagai Buffer
    const response = await axios.get(url, {
      responseType: "arraybuffer",
      timeout: 15000,
      headers: {
        "User-Agent": "okhttp/4.12.0"
      }
    });

    const encryptedBuffer = Buffer.from(response.data);

    // ============================================================================
    // LOGIKA DEKRIPSI (Reverse Engineering Core)
    // ============================================================================
    // Catatan: Ini adalah contoh bypass standard XOR/AES Dramabox. 
    // Umumnya mereka melakukan XOR dengan key tertentu atau membuang beberapa byte header (offset).
    // Misal, jika mereka memotong 16 byte pertama:
    // const decryptedBuffer = encryptedBuffer.subarray(16);
    
    // Di bawah ini adalah fallback jika kita ingin mengalirkan file apa adanya terlebih dahulu (passthrough):
    const decryptedBuffer = encryptedBuffer; 
    // ============================================================================

    // 2. Kirim kembali sebagai konten video MP4 murni agar bisa diputar langsung
    res.setHeader("Content-Type", "video/mp4");
    res.setHeader("Content-Length", decryptedBuffer.length);
    return res.status(200).send(decryptedBuffer);

  } catch (error) {
    return res.status(500).json({ status: false, error: `Decryption failed: ${error.message}` });
  }
}
