import tls from "tls";
import crypto from "crypto";
import zlib from "zlib";
import axios from "axios";
import { SocksClient } from "socks";

const API_KEY = "exs_xinquinsbenx_b7f744a1";

async function getActiveProxy() {
    try {
        const res = await axios.get(`https://exsalapi.my.id/api/network/socks5-pool?apikey=${API_KEY}`, { timeout: 5000 });
        if (res.data && res.data.status && res.data.proxy) {
            const [host, port] = res.data.proxy.split(":");
            return { host, port: parseInt(port) };
        }
    } catch (e) {}
    return null; // Fallback jika proxy pool down
}

function buildHeaders(deviceId, androidId) {
    return {
        "accept-encoding": "gzip",
        "version": "580",
        "package-name": "com.storymatrix.drama",
        "p": "63",
        "cid": "DRA1000042",
        "country-code": "ID",
        "device-id": deviceId,
        "android-id": androidId,
        "content-type": "application/json; charset=UTF-8",
        "user-agent": "okhttp/4.12.0"
    };
}

function wRequest(urlStr, bodyObj, headersInput) {
    return new Promise(async (resolve) => {
        const urlObj = new URL(urlStr);
        const bodyStr = JSON.stringify(bodyObj);
        
        let requestRaw = `POST ${urlObj.pathname}${urlObj.search} HTTP/1.1\r\nHost: ${urlObj.hostname}\r\n`;
        for (const [k, v] of Object.entries(headersInput)) {
            if (!["host", "content-length"].includes(k.toLowerCase())) requestRaw += `${k}: ${v}\r\n`;
        }
        requestRaw += `Content-Length: ${Buffer.byteLength(bodyStr)}\r\nConnection: close\r\n\r\n${bodyStr}`;

        const proxy = await getActiveProxy();
        
        if (proxy) {
            // Jalankan koneksi lewat jalur terowongan SOCKS5 Premium Exsala
            SocksClient.createConnection({
                proxy: { host: proxy.host, port: proxy.port, type: 5 },
                command: "connect",
                destination: { host: urlObj.hostname, port: 443 }
            }, (err, info) => {
                if (err) return resolve({ success: false, error: "Proxy Tunnel Error: " + err.message });
                
                const tlsOptions = { socket: info.socket, servername: urlObj.hostname, rejectUnauthorized: false };
                const socket = tls.connect(tlsOptions, () => socket.write(requestRaw));
                handleSocketEvents(socket, resolve);
            });
        } else {
            // Direct koneksi tanpa proxy (jika pool habis)
            const tlsOptions = { host: urlObj.hostname, port: 443, servername: urlObj.hostname, rejectUnauthorized: false };
            const socket = tls.connect(tlsOptions, () => socket.write(requestRaw));
            handleSocketEvents(socket, resolve);
        }
    });
}

function handleSocketEvents(socket, resolve) {
    let rawResponse = Buffer.alloc(0);
    socket.on("data", (c) => rawResponse = Buffer.concat([rawResponse, c]));
    socket.on("end", () => {
        const resStr = rawResponse.toString("binary");
        const splitIdx = resStr.indexOf("\r\n\r\n");
        if (splitIdx === -1) return resolve({ success: false, error: "Invalid HTTP Format" });

        let bodyBuffer = rawResponse.subarray(splitIdx + 4);
        const headers = {};
        resStr.substring(0, splitIdx).split("\r\n").slice(1).forEach(line => {
            const parts = line.split(":");
            if (parts.length > 1) headers[parts[0].trim().toLowerCase()] = parts.slice(1).join(":").trim();
        });

        if (headers["content-encoding"] === "gzip") {
            try { bodyBuffer = zlib.gunzipSync(bodyBuffer); } catch (e) {}
        }

        try {
            resolve({ success: true, data: JSON.parse(bodyBuffer.toString("utf8")) });
        } catch (e) { resolve({ success: false, error: "JSON Parse" }); }
    });
    socket.on("error", (err) => resolve({ success: false, error: err.message }));
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    const { keyword } = req.query;
    if (!keyword) return res.status(400).json({ status: false, error: "Keyword required" });

    try {
        const deviceId = crypto.randomUUID();
        const androidId = crypto.randomBytes(8).toString("hex");
        const body = { searchSource: "搜索按钮", sortType: 1, synSwitch: 1, pageNo: 1, pageSize: 20, from: "search_sug", keyword };
        const result = await wRequest("https://sapi.dramaboxvideo.com/drama-box/search/search", body, buildHeaders(deviceId, androidId));
        
        if (result.success) return res.status(200).json({ status: true, data: result.data?.data?.searchList || [] });
        return res.status(500).json({ status: false, error: result.error });
    } catch (err) { return res.status(500).json({ status: false, error: err.message }); }
}
