import crypto from "crypto";

export default function handler(req, res) {
  // Aktifkan CORS agar script CLI kamu bisa mengaksesnya
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  // 1. Generate Android ID (16 karakter hexadesimal)
  const androidId = crypto.randomBytes(8).toString("hex");

  // 2. Generate Device ID (Biasanya UUID v4 atau kombinasi md5)
  const deviceId = crypto.randomUUID();

  // 3. Generate Mock Token Session (Untuk authorization 'Bearer ...')
  // Token aslinya didapat saat aplikasi pertama kali melakukan 'register/login匿名' (anonymous login)
  const mockToken = crypto.randomBytes(32).toString("base64")
    .replace(/[^a-zA-Z0-9]/g, "").substring(0, 40);

  return res.status(200).json({
    status: true,
    data: {
      sn: mockToken,          // Di CLI akan dipetakan ke session.token
      device_id: deviceId,    // Di CLI akan dipetakan ke session.deviceid
      android_id: androidId   // Di CLI akan dipetakan ke session.androidid
    }
  });
}
