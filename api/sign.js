import crypto from "crypto";

// Salt rahasia yang tertanam di dalam APK Dramabox (ini contoh yang sering digunakan)
const APP_SECRET_SALT = "dramabox_secret_key_2024_prod"; 

function generateDramaboxSignature(body, deviceId, timestamp) {
  let stringToSign = "";

  // 1. Jika body berupa object, kita urutkan key-nya (Alphabetical Sort)
  if (body && typeof body === "object") {
    const sortedKeys = Object.keys(body).sort();
    const sortedObj = {};
    sortedKeys.forEach(key => {
      sortedObj[key] = body[key];
    });
    stringToSign = JSON.stringify(sortedObj);
  } else if (typeof body === "string") {
    stringToSign = body;
  }

  // 2. Gabungkan Body + DeviceID + Timestamp + Salt Rahasia
  // Catatan: Pola gabungan ini bisa bervariasi tergantung versi APK (misal: hanya body + salt)
  const rawDataToHash = `${stringToSign}${deviceId}${timestamp}${APP_SECRET_SALT}`;

  // 3. Lakukan Hashing MD5
  return crypto.createHash("md5").update(rawDataToHash, "utf8").digest("hex");
}

export default async function handler(req, res) {
  // Handle CORS Preflight
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const { body, device_id, android_id, token } = req.body;
    const timestamp = Date.now().toString();

    // Jalankan fungsi generator signature
    const signature = generateDramaboxSignature(body, device_id, timestamp);

    return res.status(200).json({
      status: true,
      data: {
        sn: signature,          // Hasil MD5 Hash untuk header 'sn'
        timestamp: timestamp    // Waktu yang harus sinkron dengan query parameter url
      }
    });
  } catch (error) {
    return res.status(500).json({ status: false, error: error.message });
  }
}
