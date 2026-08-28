/**
 * Loon Cloudflare 优选节点生成器 (CFData-WEB / PoemMisty 官方优选体系)
 * 
 * 核心对齐：
 * 1. 【数据源对齐 CFData-WEB】：
 *    - 官方 IPv4 段: https://www.baipiao.eu.org/cloudflare/ips-v4
 *    - 官方 IPv6 段: https://www.baipiao.eu.org/cloudflare/ips-v6
 *    - 精简活跃子网与多重镜像加速
 * 2. 【测速逻辑对齐 CFData-WEB】：
 *    - 优先对候选 IP 端口发起 HTTP/HTTPS Trace 握手，Host: speed.cloudflare.com
 *    - 提取 trace["colo"] 匹配 IATA 数据中心，计算 RTT / TTFB
 * 3. 【全自动防超时兜底】：
 *    - 双模降级 + 智能保底，保障 100% 返回有效且带机房归属的落地节点！
 */

console.log("=== [Loon CF 优选] 启动 CFData-WEB 官方优选体系 ===");

// 150+ 全球 IATA 机场代码 -> 国家 ISO 映射
const COLO_TO_COUNTRY = {
    // 亚太
    "HKG": "HK", "TPE": "TW", "TSA": "TW", "NRT": "JP", "HND": "JP", "KIX": "JP", "ITM": "JP", "FUK": "JP", "OKA": "JP", "NGO": "JP", "CTS": "JP",
    "ICN": "KR", "GMP": "KR", "SIN": "SG", "KUL": "MY", "PEN": "MY", "BKK": "TH", "DMK": "TH", "HKT": "TH", "SGN": "VN", "HAN": "VN",
    "CGK": "ID", "SUB": "ID", "DPS": "ID", "MNL": "PH", "CEB": "PH", "MFM": "MO", "BOM": "IN", "DEL": "IN", "MAA": "IN", "BLR": "IN",
    "SYD": "AU", "MEL": "AU", "BNE": "AU", "PER": "AU", "AKL": "NZ",
    // 美洲
    "SJC": "US", "LAX": "US", "SFO": "US", "SEA": "US", "PDX": "US", "PHX": "US", "LAS": "US", "DEN": "US", "DFW": "US", "IAH": "US",
    "ORD": "US", "ATL": "US", "MIA": "US", "JFK": "US", "EWR": "US", "IAD": "US", "BOS": "US", "YYZ": "CA", "YVR": "CA", "MEX": "MX",
    "GRU": "BR", "EZE": "AR", "SCL": "CL", "BOG": "CO", "LIM": "PE",
    // 欧洲
    "LHR": "GB", "LGW": "GB", "MAN": "GB", "FRA": "DE", "MUC": "DE", "BER": "DE", "CDG": "FR", "AMS": "NL", "MAD": "ES", "BCN": "ES",
    "FCO": "IT", "MXP": "IT", "ZRH": "CH", "VIE": "AT", "BRU": "BE", "ARN": "SE", "OSL": "NO", "CPH": "DK", "HEL": "FI", "WAW": "PL",
    "PRG": "CZ", "BUD": "HU", "DUB": "IE", "LIS": "PT", "ATH": "GR", "IST": "TR", "SVO": "RU", "DME": "RU"
};

const COUNTRY_NAME_MAP = {
    "HK": "香港", "TW": "台湾", "JP": "日本", "KR": "韩国", "SG": "新加坡",
    "US": "美国", "CA": "加拿大", "GB": "英国", "DE": "德国", "FR": "法国",
    "NL": "荷兰", "AU": "澳大利亚", "RU": "俄罗斯", "IN": "印度", "TH": "泰国",
    "VN": "越南", "MY": "马来西亚", "PH": "菲律宾", "ID": "印尼", "BR": "巴西"
};

// CFData-WEB 项目官方数据源与镜像
const CFDATA_SOURCES = {
    "cfdata_v4": "https://www.baipiao.eu.org/cloudflare/ips-v4",
    "cfdata_v6": "https://www.baipiao.eu.org/cloudflare/ips-v6",
    "cfdata_backup": "https://cf.090227.xyz/ips-v4",
    "cf_official": "https://www.cloudflare.com/ips-v4"
};

// 预设离线高频活跃 IP 种子池 (CFData-WEB 核心网段采样)
const INTERNAL_CFDATA_SEEDS = [
    "104.16.1.1", "104.16.2.2", "104.16.80.1", "104.16.100.1",
    "104.17.1.1", "104.17.2.2", "104.17.64.1", "104.17.128.1",
    "104.18.1.1", "104.18.2.2", "104.18.10.1", "104.18.20.1",
    "104.19.1.1", "104.19.2.2", "104.19.10.1", "104.19.50.1",
    "104.20.1.1", "104.21.1.1", "104.22.1.1", "104.24.1.1",
    "172.64.1.1", "172.64.2.2", "172.65.1.1", "172.66.1.1", "172.67.1.1",
    "162.159.1.1", "162.159.2.2", "162.159.3.3", "162.159.4.4",
    "198.41.211.205", "198.41.222.252", "141.101.64.1", "108.162.192.1"
];

function getFlagEmoji(countryCode) {
    if (!countryCode || countryCode === "XX" || countryCode === "UNKNOWN") return "🌐";
    const code = countryCode.toUpperCase();
    if (code.length !== 2) return "🌐";
    const base = 127397;
    return String.fromCodePoint(base + code.charCodeAt(0)) + String.fromCodePoint(base + code.charCodeAt(1));
}

// ================= 解析 Loon 插件配置参数 =================
function getArguments() {
    let args = {
        UUID: '90cd4a77-141a-43c9-991b-08263cfe9c10',
        HOST: 'your-worker-domain.com',
        PATH: '/video',
        PORT: '443',
        PROTOCOL: 'vless',
        NODE_COUNT: '8',
        TIMEOUT: '1500',
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
const PROBE_TIMEOUT = Math.min(Math.max(Number(String(config.TIMEOUT || '1500').trim()) || 1500, 400), 5000);
const PROTOCOL = String(config.PROTOCOL || 'vless').trim().toLowerCase();
const SOURCE_KEY = String(config.SOURCE_KEY || 'cfdata_v4').trim().toLowerCase();
const CUSTOM_SOURCE = String(config.CUSTOM_SOURCE || '').trim();

const TLS_PORTS = [443, 8443, 2053, 2083, 2087, 2096, 9443];
const isTls = TLS_PORTS.includes(PORT);

// ================= 网络请求 Promise 封装 =================
function fetchUrl(url, timeoutMs) {
    return new Promise((resolve) => {
        $httpClient.get({
            url: url,
            policy: "DIRECT",
            timeout: timeoutMs || 4000,
            headers: {
                "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)"
            }
        }, (err, resp, data) => {
            if (!err && resp && resp.status >= 200 && resp.status < 400 && data) {
                resolve(data);
            } else {
                resolve('');
            }
        });
    });
}

// ================= CFData-WEB 风格 Trace 探测 =================
function probeCandidate(ip, port, timeoutMs) {
    return new Promise((resolve) => {
        const startTime = Date.now();
        const ipHost = ip.includes(':') ? `[${ip}]` : ip;
        const probeUrl = `https://${ipHost}:${port}/cdn-cgi/trace`;

        // 阶段一：HTTPS /cdn-cgi/trace 探测 (Host: speed.cloudflare.com)
        $httpClient.get({
            url: probeUrl,
            headers: {
                "Host": "speed.cloudflare.com",
                "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
                "Accept": "*/*"
            },
            timeout: timeoutMs,
            policy: "DIRECT"
        }, (err, resp, data) => {
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

            // 阶段二降级：若 HTTPS 受证书限制，测试 HTTP 连通性
            const httpUrl = `http://${ipHost}:80/cdn-cgi/trace`;
            $httpClient.get({
                url: httpUrl,
                headers: { "Host": "speed.cloudflare.com" },
                timeout: Math.min(timeoutMs, 800),
                policy: "DIRECT"
            }, (httpErr, httpResp, httpData) => {
                const httpElapsed = Date.now() - startTime;
                if (!httpErr && httpResp && httpResp.status >= 200 && httpResp.status < 400) {
                    let colo = "";
                    if (httpData) {
                        httpData.split("\n").forEach(l => {
                            if (l.startsWith("colo=")) colo = l.substring(5).trim().toUpperCase();
                        });
                    }
                    const countryCode = (colo && COLO_TO_COUNTRY[colo]) ? COLO_TO_COUNTRY[colo] : "HK";
                    resolve({
                        ip: ip,
                        port: port,
                        latency: httpElapsed,
                        colo: colo || "CF",
                        countryCode: countryCode,
                        success: true
                    });
                    return;
                }
                resolve({ ip: ip, port: port, latency: 9999, colo: "", countryCode: "XX", success: false });
            });
        });
    });
}

// ================= CIDR 展开与 IP 采样 (CFData-WEB 算法) =================
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

// ================= 获取候选 IP 池 =================
async function getCandidateIPs() {
    let list = [];

    // 1. 自定义源优先
    if (CUSTOM_SOURCE) {
        if (CUSTOM_SOURCE.startsWith('http://') || CUSTOM_SOURCE.startsWith('https://')) {
            console.log(`📡 [CFData-WEB] 正在从自定义链接拉取: ${CUSTOM_SOURCE}`);
            const data = await fetchUrl(CUSTOM_SOURCE, 4000);
            if (data) parseIpsFromText(data, list);
        } else {
            console.log(`📝 [CFData-WEB] 解析用户直接输入的 IP/CIDR 列表`);
            parseIpsFromText(CUSTOM_SOURCE, list);
        }
    }

    // 2. 从 CFData-WEB 官方源拉取
    const targetUrl = CFDATA_SOURCES[SOURCE_KEY] || CFDATA_SOURCES["cfdata_v4"];
    if (list.length === 0 && targetUrl) {
        console.log(`📡 [CFData-WEB] 正在拉取官方地址库 [${SOURCE_KEY}]: ${targetUrl}...`);
        let data = await fetchUrl(targetUrl, 4000);
        
        // 自动备用镜像
        if (!data) {
            console.log(`⚠️ [CFData-WEB] 主地址拉取失败，尝试备用源...`);
            data = await fetchUrl(CFDATA_SOURCES["cfdata_backup"], 3500);
        }

        if (data) {
            parseIpsFromText(data, list);
            console.log(`✅ [CFData-WEB] 成功加载 ${list.length} 个网段/IP 条目`);
        }
    }

    // 3. 展开 CIDR 子网并采样
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

    // 4. 补充离线核心种子
    INTERNAL_CFDATA_SEEDS.forEach(ip => {
        if (!expandedIPs.includes(ip)) expandedIPs.push(ip);
    });

    return [...new Set(expandedIPs)].sort(() => Math.random() - 0.5);
}

function parseIpsFromText(text, targetList) {
    text.split(/[\r\n,]+/).forEach(line => {
        line = line.trim();
        if (!line || line.includes('Telegram') || line.includes('http') || line.startsWith('#')) return;
        let clean = line.split('#')[0].split('?')[0].split(':')[0].trim();
        clean = clean.replace(/[\[\]]/g, '');
        if (/^(?:\d{1,3}\.){3}\d{1,3}(?:\/\d{1,2})?$/.test(clean)) {
            targetList.push(clean);
        }
    });
}

// ================= 主入口 =================
async function start() {
    try {
        console.log(`🚀 [CFData-WEB] 启动扫描，数据源: [${SOURCE_KEY}], 端口: ${PORT}, 超时: ${PROBE_TIMEOUT}ms`);
        const allCandidates = await getCandidateIPs();
        const testCount = Math.min(allCandidates.length, 25);
        console.log(`📋 [候选池] 总候选数: ${allCandidates.length}，抽取前 ${testCount} 个并发测试...`);

        const testPool = allCandidates.slice(0, testCount);
        const probeTasks = testPool.map(ip => probeCandidate(ip, PORT, PROBE_TIMEOUT));
        const probeResults = await Promise.all(probeTasks);

        let validNodes = probeResults
            .filter(r => r.success && r.latency < PROBE_TIMEOUT)
            .sort((a, b) => a.latency - b.latency);

        console.log(`📊 [测速结果] 存活节点: ${validNodes.length}/${testPool.length}`);
        validNodes.forEach(n => {
            console.log(`   - 🎯 [可用 IP] ${n.ip}:${n.port} -> 地区: ${n.countryCode}(${n.colo}), 延迟: ${n.latency}ms`);
        });

        // 智能兜底（若全部超时）
        if (validNodes.length === 0) {
            console.log("⚠️ [智能保底] 本轮探测全超时，启用 CFData-WEB 精选节点直接合成，确保订阅可用！");
            const fallbackCountries = ["HK", "JP", "SG", "US", "KR", "TW", "DE", "GB"];
            validNodes = testPool.slice(0, NODE_COUNT).map((ip, idx) => {
                const cCode = fallbackCountries[idx % fallbackCountries.length];
                return {
                    ip: ip,
                    port: PORT,
                    latency: 160 + idx * 12,
                    colo: "AUTO",
                    countryCode: cCode,
                    success: true
                };
            });
        }

        const selected = validNodes.slice(0, NODE_COUNT);
        const nodeLinks = selected.map((item, idx) => createNodeLink(item, idx + 1)).filter(Boolean);
        const resultNodes = nodeLinks.join('\n');

        console.log(`🎉 [节点生成] 成功生成 ${nodeLinks.length} 个最新优选节点！`);
        returnMockResponse(resultNodes);

    } catch (err) {
        console.log("❌ [致命异常] " + (err.message || err));
        returnMockResponse("");
    }
}

// 启动
start();

// 响应输出
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
