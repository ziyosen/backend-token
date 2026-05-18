import tls from "tls";
import crypto from "crypto";
import zlib from "zlib";

function buildHeaders(deviceId, androidId, tokenStr) {
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
    return new Promise((resolve) => {
        const urlObj = new URL(urlStr);
        const bodyStr = JSON.stringify(bodyObj);
        
        let requestRaw = `POST ${urlObj.pathname}${urlObj.search} HTTP/1.1\r\nHost: ${urlObj.hostname}\r\n`;
        for (const [k, v] of Object.entries(headersInput)) {
            if (!["host", "content-length"].includes(k.toLowerCase())) requestRaw += `${k}: ${v}\r\n`;
        }
        requestRaw += `Content-Length: ${Buffer.byteLength(bodyStr)}\r\nConnection: close\r\n\r\n${bodyStr}`;

        const tlsOptions = {
            host: urlObj.hostname,
            servername: urlObj.hostname,
            rejectUnauthorized: false,
            ciphers: "TLS_AES_128_GCM_SHA256:TLS_AES_256_GCM_SHA384",
            ALPNProtocols: ["http/1.1"]
        };

        const socket = tls.connect(tlsOptions, () => socket.write(requestRaw));
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
            } catch (e) {
                resolve({ success: false, error: "JSON Parse Error" });
            }
        });
        socket.on("error", (err) => resolve({ success: false, error: err.message }));
    });
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');

    const { keyword } = req.query;
    if (!keyword) return res.status(400).json({ status: false, error: "Keyword required" });

    try {
        const deviceId = crypto.randomUUID();
        const androidId = crypto.randomBytes(8).toString("hex");

        const body = { searchSource: "搜索按钮", sortType: 1, synSwitch: 1, pageNo: 1, pageSize: 20, from: "search_sug", keyword };
        const headers = buildHeaders(deviceId, androidId);

        const result = await wRequest("https://sapi.dramaboxvideo.com/drama-box/search/search", body, headers);
        
        if (result.success) {
            return res.status(200).json({ status: true, data: result.data?.data?.searchList || [] });
        } else {
            return res.status(500).json({ status: false, error: result.error });
        }
    } catch (err) {
        return res.status(500).json({ status: false, error: err.message });
    }
}
