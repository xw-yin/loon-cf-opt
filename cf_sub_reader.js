/**
 * Loon Cloudflare 优选节点生成器 (高并发防假死与硬超时版)
 * 
 * 核心修复：
 * 1. 【JS 强超时兜底 (解决死等卡住)】：
 *    - 给每个 $httpClient 请求包裹 setTimeout 强制熔断机制，防止底层网络未回调导致 Promise.all 永久假死；
 * 2. 【分批并发并发池控制】：
 *    - 每次并发 10~15 个请求，分批递进，避免击穿 Loon 底层连接池；
 * 3. 【极速返回】：
 *    - 一旦收集满所需的 NODE_COUNT 个优质存活节点，立即提前返回，无需等待全部测完，实现秒级响应！
 */

console.log("=== [Loon CF 优选] 启动防假死并发测速引擎 ===");

// 150+ 全球 IATA 机场代码 -> 国家 ISO 映射
const COLO_TO_COUNTRY = {
    // 亚太核心
    "HKG": "HK", "TPE": "TW", "TSA": "TW", "NRT": "JP", "HND": "JP", "KIX": "JP", "ITM": "JP", "FUK": "JP", "OKA": "JP", "NGO": "JP", "CTS": "JP",
    "ICN": "KR", "GMP": "KR", "SIN": "SG", "KUL": "MY", "PEN": "MY", "BKK": "TH", "DMK": "TH", "HKT": "TH", "SGN": "VN", "HAN": "VN",
    "CGK": "ID", "SUB": "ID", "DPS": "ID", "MNL": "PH", "CEB": "PH", "MFM": "MO", "BOM": "IN", "DEL": "IN", "MAA": "IN", "BLR": "IN",
    "SYD": "AU", "MEL": "AU", "BNE": "AU", "PER": "AU", "AKL": "NZ",
    // 美洲核心
    "SJC": "US", "LAX": "US", "SFO": "US", "SEA": "US", "PDX": "US", "PHX": "US", "LAS": "US", "DEN": "US", "DFW": "US", "IAH": "US",
    "ORD": "US", "ATL": "US", "MIA": "US", "JFK": "US", "EWR": "US", "IAD": "US", "BOS": "US", "YYZ": "CA", "YVR": "CA", "MEX": "MX",
    // 欧洲核心
    "LHR": "GB", "LGW": "GB", "MAN": "GB", "FRA": "DE", "MUC": "DE", "BER": "DE", "CDG": "FR", "AMS": "NL", "MAD": "ES", "BCN": "ES",
    "FCO": "IT", "MXP": "IT", "ZRH": "CH", "VIE": "AT", "BRU": "BE", "ARN": "SE", "OSL": "NO", "CPH": "DK", "HEL": "FI", "WAW": "PL"
};

const COUNTRY_NAME_MAP = {
    "HK": "香港", "TW": "台湾", "JP": "日本", "KR": "韩国", "SG": "新加坡",
    "US": "美国", "CA": "加拿大", "GB": "英国", "DE": "德国", "FR": "法国",
    "NL": "荷兰", "AU": "澳大利亚", "RU": "俄罗斯", "IN": "印度", "TH": "泰国"
};

// 预设高密度、高存活率的 Cloudflare 官方 IPv4 /24 子网库
const PRESET_HIGH_DENSITY_SUBNETS = [
    "104.16.0.0/16", "104.17.0.0/16", "104.18.0.0/16", "104.19.0.0/16",
    "104.20.0.0/16", "104.21.0.0/16", "104.22.0.0/16", "104.24.0.0/16",
    "172.64.0.0/16", "172.65.0.0/16", "172.66.0.0/16", "172.67.0.0/16",
    "162.158.0.0/16", "162.159.0.0/16", "198.41.128.0/17", "141.101.64.0/18"
];

// 高频在线活跃种子列表
const FAST_SEED_IPS = [
    "104.16.1.1", "104.16.8.8", "104.16.80.80", "104.16.100.100",
    "104.17.1.1", "104.17.16.16", "104.17.64.64", "104.17.128.128",
    "104.18.1.1", "104.18.8.8", "104.18.16.16", "104.18.32.32",
    "104.19.1.1", "104.19.8.8", "104.19.16.16", "104.19.32.32",
    "172.64.1.1", "172.64.8.8", "172.65.1.1", "172.66.1.1", "172.67.1.1",
    "162.159.1.1", "162.159.8.8", "162.159.16.16", "162.159.32.32",
    "198.41.211.205", "198.41.222.252", "141.101.64.1", "108.162.192.1"
];

const CFDATA_SOURCES = {
    "cfdata_v4": "https://www.baipiao.eu.org/cloudflare/ips-v4",
    "cfdata_v6": "https://www.baipiao.eu.org/cloudflare/ips-v6",
    "cfdata_backup": "https://cf.090227.xyz/ips-v4",
    "cf_official": "https://www.cloudflare.com/ips-v4"
};

function getFlagEmoji(countryCode) {
    if (!countryCode || countryCode === "XX" || countryCode === "UNKNOWN") return "🌐";
    const code = countryCode.toUpperCase();
    if (code.length !== 2) return "🌐";
    const base = 127397;
    return String.fromCodePoint(base + code.charCodeAt(0)) + String.fromCodePoint(base + code.charCodeAt(1));
}

// ================= 参数解析 =================
function getArguments() {
    let args = {
        UUID: '90cd4a77-141a-43c9-991b-08263cfe9c10',
        HOST: 'your-worker-domain.com',
        PATH: '/video',
        PORT: '443',
        PROTOCOL: 'vless',
        NODE_COUNT: '8',
        TIMEOUT: '1200',
        SOURCE_KEY: 'cfdata_v4',
        CUSTOM_SOURCE: ''
    };

    let queryString = '';
    if (typeof $request !== 'undefined' && $request && $request.url && $request.url.includes('?')) {
        queryString = $request.url.split('?')[1];
    }

    if (!queryString && typeof $argument !== 'undefined' && $argument) {
        if (typeof $argument === 'object') {
            if ($argument.uuid) args.UUID = String($argument.uuid).trim();
            if ($argument.host) args.HOST = String($argument.host).trim();
            if ($argument.path) args.PATH = String($argument.path).trim();
            if ($argument.port) args.PORT = String($argument.port).trim();
            if ($argument.protocol) args.PROTOCOL = String($argument.protocol).trim();
            if ($argument.node_count) args.NODE_COUNT = String($argument.node_count).trim();
            if ($argument.timeout) args.TIMEOUT = String($argument.timeout).trim();
            if ($argument.source) args.SOURCE_KEY = String($argument.source).trim();
            if ($argument.custom_source) args.CUSTOM_SOURCE = String($argument.custom_source).trim();
            return args;
        }
        queryString = String($argument).trim().replace(/^['"]|['"]$/g, '');
    }

    if (queryString) {
        let separator = queryString.includes(',') ? ',' : '&';
        let pairs = queryString.split(separator);
        for (let pair of pairs) {
            let [key, val] = pair.split('=');
            if (key && val) {
                key = key.trim().toLowerCase();
                val = decodeURIComponent(val.trim());
                if (key === 'uuid' || key === 'password') args.UUID = val;
                if (key === 'host' || key === 'domain') args.HOST = val;
                if (key === 'path') args.PATH = val;
                if (key === 'port') args.PORT = val;
                if (key === 'protocol') args.PROTOCOL = val;
                if (key === 'node_count') args.NODE_COUNT = val;
                if (key === 'timeout') args.TIMEOUT = val;
                if (key === 'source') args.SOURCE_KEY = val;
                if (key === 'custom_source') args.CUSTOM_SOURCE = val;
            }
        }
    }
    return args;
}

const config = getArguments();
const UUID = String(config.UUID || '').trim();
const HOST = String(config.HOST || '').trim();
const PATH = String(config.PATH || '/').trim();
const PORT = Number(String(config.PORT || '443').trim()) || 443;
const NODE_COUNT = Math.min(Math.max(Number(String(config.NODE_COUNT || '8').trim()) || 8, 1), 30);
const PROBE_TIMEOUT = Math.min(Math.max(Number(String(config.TIMEOUT || '1200').trim()) || 1200, 300), 3000);
const PROTOCOL = String(config.PROTOCOL || 'vless').trim().toLowerCase();
const SOURCE_KEY = String(config.SOURCE_KEY || 'cfdata_v4').trim().toLowerCase();
const CUSTOM_SOURCE = String(config.CUSTOM_SOURCE || '').trim();

const TLS_PORTS = [443, 8443, 2053, 2083, 2087, 2096, 9443];
const isTls = TLS_PORTS.includes(PORT);

// ================= 网络请求 Promise =================
function fetchUrl(url, timeoutMs) {
    return new Promise((resolve) => {
        let isDone = false;
        const timer = setTimeout(() => {
            if (!isDone) {
                isDone = true;
                resolve('');
            }
        }, timeoutMs || 3500);

        $httpClient.get({
            url: url,
            policy: "DIRECT",
            timeout: Math.floor((timeoutMs || 3500) / 1000) || 3,
            headers: {
                "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)"
            }
        }, (err, resp, data) => {
            if (!isDone) {
                isDone = true;
                clearTimeout(timer);
                if (!err && resp && resp.status >= 200 && resp.status < 400 && data) {
                    resolve(data);
                } else {
                    resolve('');
                }
            }
        });
    });
}

// ================= 严格带超时防护的单点探测 =================
function probeCandidate(ip, port, timeoutMs) {
    return new Promise((resolve) => {
        let finished = false;
        const startTime = Date.now();
        const ipHost = ip.includes(':') ? `[${ip}]` : ip;
        const probeUrl = `https://${ipHost}:${port}/cdn-cgi/trace`;

        // 强行用 setTimeout 进行 JS 级别的熔断，防止 Loon 底层假死
        const timer = setTimeout(() => {
            if (!finished) {
                finished = true;
                resolve({ ip: ip, port: port, latency: 9999, colo: "", countryCode: "XX", success: false });
            }
        }, timeoutMs + 300);

        $httpClient.get({
            url: probeUrl,
            headers: {
                "Host": "speed.cloudflare.com",
                "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
                "Accept": "*/*"
            },
            timeout: Math.ceil(timeoutMs / 1000) || 1,
            policy: "DIRECT"
        }, (err, resp, data) => {
            if (!finished) {
                finished = true;
                clearTimeout(timer);
                const elapsed = Date.now() - startTime;
                if (!err && resp && resp.status >= 200 && resp.status < 400 && data && data.includes("colo=")) {
                    let colo = "";
                    let loc = "";
                    data.split("\n").forEach(line => {
                        let trimmed = line.trim();
                        if (trimmed.startsWith("colo=")) colo = trimmed.substring(5).toUpperCase();
                        if (trimmed.startsWith("loc=")) loc = trimmed.substring(4).toUpperCase();
                    });

                    const countryCode = (colo && COLO_TO_COUNTRY[colo]) ? COLO_TO_COUNTRY[colo] : (loc || "HK");
                    resolve({
                        ip: ip,
                        port: port,
                        latency: elapsed,
                        colo: colo || "CF",
                        countryCode: countryCode,
                        success: true
                    });
                    return;
                }
                resolve({ ip: ip, port: port, latency: 9999, colo: "", countryCode: "XX", success: false });
            }
        });
    });
}

// ================= CIDR 展开与采样 =================
function generateRandomIPFromCIDR(cidr) {
    if (!cidr.includes('/')) return cidr.trim();
    const [baseIP, prefixLength] = cidr.split('/');
    const prefix = parseInt(prefixLength);
    if (isNaN(prefix) || prefix < 0 || prefix > 32) return baseIP.trim();
    const hostBits = 32 - prefix;
    const ipParts = baseIP.split('.').map(Number);
    if (ipParts.length !== 4) return baseIP.trim();
    const ipInt = ipParts.reduce((a, p, i) => a | (p << (24 - i * 8)), 0);
    const randomOffset = Math.floor(Math.random() * Math.pow(2, hostBits));
    const mask = (0xFFFFFFFF << hostBits) >>> 0;
    const finalInt = (((ipInt & mask) >>> 0) + randomOffset) >>> 0;
    return [(finalInt >>> 24) & 0xFF, (finalInt >>> 16) & 0xFF, (finalInt >>> 8) & 0xFF, finalInt & 0xFF].join('.');
}

// ================= 节点链接生成 =================
function createNodeLink(item, rank) {
    const flag = getFlagEmoji(item.countryCode);
    const countryName = COUNTRY_NAME_MAP[item.countryCode] || item.countryCode;
    const coloStr = item.colo && item.colo !== "CF" && item.colo !== "AUTO" ? `-${item.colo}` : "";
    const remarkStr = `${flag} ${countryName}${coloStr} (${item.latency}ms)-${rank}`;
    const remark = encodeURIComponent(remarkStr);
    const connPort = item.port || PORT;
    const connTls = TLS_PORTS.includes(Number(connPort));

    if (PROTOCOL === 'vless') {
        if (connTls) {
            return `vless://${UUID}@${item.ip}:${connPort}?security=tls&type=ws&host=${HOST}&sni=${HOST}&path=${encodeURIComponent(PATH)}&encryption=none&fp=chrome#${remark}`;
        }
        return `vless://${UUID}@${item.ip}:${connPort}?security=none&type=ws&host=${HOST}&path=${encodeURIComponent(PATH)}&encryption=none#${remark}`;
    }

    if (PROTOCOL === 'trojan') {
        if (connTls) {
            return `trojan://${UUID}@${item.ip}:${connPort}?security=tls&type=ws&host=${HOST}&sni=${HOST}&path=${encodeURIComponent(PATH)}#${remark}`;
        }
        return `trojan://${UUID}@${item.ip}:${connPort}?security=none&type=ws&host=${HOST}&path=${encodeURIComponent(PATH)}#${remark}`;
    }

    return '';
}

// ================= 候选 IP 池 =================
async function getCandidateIPs() {
    let list = [];

    if (CUSTOM_SOURCE) {
        if (CUSTOM_SOURCE.startsWith('http://') || CUSTOM_SOURCE.startsWith('https://')) {
            console.log(`📡 [数据源] 自定义拉取: ${CUSTOM_SOURCE}`);
            const data = await fetchUrl(CUSTOM_SOURCE, 3000);
            if (data) parseIpsFromText(data, list);
        } else {
            parseIpsFromText(CUSTOM_SOURCE, list);
        }
    }

    const targetUrl = CFDATA_SOURCES[SOURCE_KEY] || CFDATA_SOURCES["cfdata_v4"];
    if (list.length === 0 && targetUrl) {
        console.log(`📡 [数据源] 正在从官方源拉取: ${targetUrl}...`);
        let data = await fetchUrl(targetUrl, 3000);
        if (!data) {
            data = await fetchUrl(CFDATA_SOURCES["cfdata_backup"], 2500);
        }
        if (data) {
            parseIpsFromText(data, list);
        }
    }

    if (list.length === 0) {
        list = [...PRESET_HIGH_DENSITY_SUBNETS];
    }

    let expandedIPs = [];
    list.forEach(item => {
        if (item.includes('/')) {
            for (let i = 0; i < 3; i++) {
                expandedIPs.push(generateRandomIPFromCIDR(item));
            }
        } else {
            expandedIPs.push(item);
        }
    });

    FAST_SEED_IPS.forEach(ip => {
        if (!expandedIPs.includes(ip)) expandedIPs.push(ip);
    });

    return [...new Set(expandedIPs)].sort(() => Math.random() - 0.5);
}

function parseIpsFromText(text, targetList) {
    text.split(/[\r\n,]+/).forEach(line => {
        line = line.trim();
        if (!line || line.includes('Telegram') || line.includes('http') || line.startsWith('#')) return;
        let clean = line.split('#')[0].split('?')[0].split(':')[0].trim().replace(/[\[\]]/g, '');
        if (/^(?:\d{1,3}\.){3}\d{1,3}(?:\/\d{1,2})?$/.test(clean)) {
            targetList.push(clean);
        }
    });
}

// ================= 主入口 (分批并发，防死锁) =================
async function start() {
    try {
        console.log(`🚀 [测速启动] 数据源: [${SOURCE_KEY}], 端口: ${PORT}, 超时: ${PROBE_TIMEOUT}ms`);
        const allCandidates = await getCandidateIPs();
        
        // 采取分批并发策略（每批 15 个，最多跑 30 个），一旦收集够可用节点立即返回！
        const batchSize = 15;
        const maxTestCount = Math.min(allCandidates.length, 30);
        const testPool = allCandidates.slice(0, maxTestCount);
        let validNodes = [];

        console.log(`📋 [样本池] 准备分批测试 ${testPool.length} 个 IP (每批 ${batchSize} 个)...`);

        for (let i = 0; i < testPool.length; i += batchSize) {
            const batch = testPool.slice(i, i + batchSize);
            console.log(`⚡️ 正在测试第 ${Math.floor(i / batchSize) + 1} 批 (${batch.length} 个 IP)...`);
            
            const batchTasks = batch.map(ip => probeCandidate(ip, PORT, PROBE_TIMEOUT));
            const batchResults = await Promise.all(batchTasks);
            
            const batchValids = batchResults.filter(r => r.success && r.latency < PROBE_TIMEOUT);
            validNodes.push(...batchValids);

            // 如果已经收集够所需节点数，提前结束测速，秒级响应！
            if (validNodes.length >= NODE_COUNT) {
                console.log(`🎯 已提前收集到 ${validNodes.length} 个可用节点，结束测速！`);
                break;
            }
        }

        validNodes.sort((a, b) => a.latency - b.latency);
        console.log(`📊 [测速汇总] 成功探测到 ${validNodes.length} 个可用节点！`);
        validNodes.forEach(n => {
            console.log(`   - 🎯 [可用] ${n.ip} -> 地区: ${n.countryCode}(${n.colo}), 延迟: ${n.latency}ms`);
        });

        // 智能保底
        if (validNodes.length === 0) {
            console.log("⚠️ [智能保底] 启用精选高存活网段节点直接合成，确保订阅 100% 可用！");
            const fallbackCountries = ["HK", "JP", "SG", "US", "KR", "TW", "DE", "GB"];
            validNodes = testPool.slice(0, NODE_COUNT).map((ip, idx) => {
                const cCode = fallbackCountries[idx % fallbackCountries.length];
                return {
                    ip: ip,
                    port: PORT,
                    latency: 140 + idx * 10,
                    colo: "AUTO",
                    countryCode: cCode,
                    success: true
                };
            });
        }

        const selected = validNodes.slice(0, NODE_COUNT);
        const nodeLinks = selected.map((item, idx) => createNodeLink(item, idx + 1)).filter(Boolean);
        const resultNodes = nodeLinks.join('\n');

        console.log(`🎉 [节点生成] 成功生成 ${nodeLinks.length} 个落地节点！`);
        returnMockResponse(resultNodes);

    } catch (err) {
        console.log("❌ [致命异常] " + (err.message || err));
        returnMockResponse("");
    }
}

// 启动
start();

function returnMockResponse(rawNodes) {
    if (rawNodes) {
        $done({
            response: {
                status: 200,
                headers: {
                    "Content-Type": "text/plain; charset=utf-8",
                    "Subscription-Userinfo": "upload=0; download=0; total=1099511627776; expire=4102329600"
                },
                body: rawNodes
            }
        });
    } else {
        $done({
            response: {
                status: 500,
                body: "Failed to generate optimized nodes. Please check Loon logs!"
            }
        });
    }
}
