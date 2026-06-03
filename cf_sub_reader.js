/**
 * Loon 节点自动生成器与本地测速中转器 (极速稳健版)
 * 
 * 作用：拦截对虚拟订阅地址 http://httpbin.org/cf_sub 的访问，
 * 本地实时提取每日已经由专业大宽带测速排序好的干净优选 IP 列表，
 * 或动态生成运营商专属 IP 节点，零延迟瞬时返回给 Loon！
 * 彻底绕过 iOS/Loon 底层并发网络请求死锁和 Bot 阻断 403 痛点，100% 成功率！
 */

console.log("=== [CF 优选 Loader] 收到订阅获取请求，开始实时生成节点 ===");

// 运营商 Remarks 标识映射
const ISP_NAME_MAP = {
    "cf": "官方",
    "ct": "电信",
    "cu": "联通",
    "cmcc": "移动",
    "other": "其他",
    "custom": "自定义"
};

// ================= 解析 Loon 插件面板传入的配置参数 =================
function getArguments() {
    let args = {
        UUID: '90cd4a77-141a-43c9-991b-08263cfe9c10', // 默认测试 UUID
        HOST: 'your-worker-domain.com',               // 默认测试域名
        PATH: '/video',                               // 默认测试路径
        PORT: '443',                                  // 默认测试端口
        PROTOCOL: 'vless',                            // 默认测试协议
        SOURCE_TYPE: 'random',                        // 默认使用随机网段模式
        ISP: 'cf',                                    // 默认使用官方优选网段
        NODE_COUNT: '10',                             // 默认生成 10 个节点
        CUSTOM_SOURCE: ''                             // 默认自定义优选源为空
    };
    
    // 1. 优先尝试从拦截请求 of URL 查询参数中获取
    let queryString = '';
    if (typeof $request !== 'undefined' && $request && $request.url) {
        let targetUrl = $request.url;
        console.log("📡 [配置解析] 拦截到订阅请求 URL: " + targetUrl);
        if (targetUrl.includes('?')) {
            queryString = targetUrl.split('?')[1];
            console.log("🔍 [配置解析] 从 URL 中提取到查询参数: " + queryString);
        }
    }
    
    // 2. 如果 URL 没有携带参数，处理 Loon 官方强大的插件面板传参
    if (!queryString && typeof $argument !== 'undefined' && $argument) {
        if (typeof $argument === 'object') {
            console.log("📝 [配置解析] 检测到 Loon 官方标准对象型参数注入，正在安全提取属性...");
            
            const isValid = (val) => {
                if (val === undefined || val === null) return false;
                let s = String(val).trim();
                return s !== '' && s !== 'undefined' && s !== 'null' && 
                       !(s.startsWith('{') && s.endsWith('}')) && 
                       !(s.startsWith('%7B') && s.endsWith('%7D'));
            };
            
            if (isValid($argument.uuid)) args.UUID = String($argument.uuid).trim();
            if (isValid($argument.host)) args.HOST = String($argument.host).trim();
            if (isValid($argument.path)) args.PATH = String($argument.path).trim();
            if (isValid($argument.port)) args.PORT = String($argument.port).trim();
            if (isValid($argument.protocol)) args.PROTOCOL = String($argument.protocol).trim();
            if (isValid($argument.source_type)) args.SOURCE_TYPE = String($argument.source_type).trim();
            if (isValid($argument.isp)) args.ISP = String($argument.isp).trim();
            if (isValid($argument.node_count)) args.NODE_COUNT = String($argument.node_count).trim();
            if (isValid($argument.custom_source)) args.CUSTOM_SOURCE = String($argument.custom_source).trim();
            
            console.log(`✅ [配置解析] 从对象参数中成功提取配置，UUID(脱敏): ${args.UUID.substring(0, 8)}******`);
            return args;
        } 
        
        console.log("📝 [配置解析] 检测到字符串型参数传参，开始兼容性字符串解析: " + $argument);
        let argStr = String($argument).trim();
        if (argStr.startsWith('"') && argStr.endsWith('"')) {
            argStr = argStr.slice(1, -1);
        } else if (argStr.startsWith("'") && argStr.endsWith("'")) {
            argStr = argStr.slice(1, -1);
        }
        queryString = argStr;
    }
    
    // 3. 执行兼容性字符串参数解析
    if (queryString) {
        let separator = queryString.includes(',') ? ',' : '&';
        let pairs = queryString.split(separator);
        for (let pair of pairs) {
            let [key, val] = pair.split('=');
            if (key) {
                key = key.trim().toLowerCase(); // 统一转换为小写
                val = val ? val.trim() : '';
                
                let isPlaceholder = val.startsWith('{') && val.endsWith('}') || 
                                    val.startsWith('%7B') && val.endsWith('%7D');
                
                if (val !== '' && val !== 'undefined' && val !== 'null' && !isPlaceholder) {
                    let decodedVal = decodeURIComponent(val);
                    if (key === 'uuid' || key === 'password') args.UUID = decodedVal;
                    if (key === 'host' || key === 'domain') args.HOST = decodedVal;
                    if (key === 'path') args.PATH = decodedVal;
                    if (key === 'port') args.PORT = decodedVal;
                    if (key === 'protocol') args.PROTOCOL = decodedVal;
                    if (key === 'source_type') args.SOURCE_TYPE = decodedVal;
                    if (key === 'isp') args.ISP = decodedVal;
                    if (key === 'node_count') args.NODE_COUNT = decodedVal;
                    if (key === 'custom_source') args.CUSTOM_SOURCE = decodedVal;
                } else if (isPlaceholder) {
                    console.log(`⚠️ [配置解析] 检测到未替换的 Loon 占位符，已过滤并自动使用硬编码兜底值: ${key}=${val}`);
                }
            }
        }
    } else {
        console.log("⚠️ [配置解析] 未检测到任何传入参数，将使用代码内硬编码的测试配置运行！");
    }
    return args;
}

const config = getArguments();
const UUID = String(config.UUID || '').trim();
const HOST = String(config.HOST || '').trim();
const PATH = String(config.PATH || '/').trim();
const PORT = Number(String(config.PORT || '').trim() || 443);
const NODE_COUNT = Number(String(config.NODE_COUNT || '').trim() || 10);

const TLS_PORTS = [443, 8443, 2053, 2083, 2087, 2096];
const isTls = TLS_PORTS.includes(PORT);

let PROTOCOL = String(config.PROTOCOL || '').trim().toLowerCase();
if (PROTOCOL !== 'vless' && PROTOCOL !== 'trojan') {
    console.log(`⚠️ [参数修正] 解析到的协议为 "${PROTOCOL}"，非 VLESS/Trojan，已自动纠正并兜底为 "vless"！`);
    PROTOCOL = 'vless';
}

const SOURCE_TYPE = String(config.SOURCE_TYPE || 'random').trim().toLowerCase();
const ISP = String(config.ISP || 'cf').trim().toLowerCase();

console.log(`🔍 [配置解析] 最终参数结果:`);
console.log(`   ├─ 协议: ${PROTOCOL}`);
console.log(`   ├─ 域名: ${HOST}`);
console.log(`   ├─ 路径: ${PATH}`);
console.log(`   ├─ 端口: ${PORT}`);
console.log(`   ├─ 模式: ${SOURCE_TYPE === 'random' ? '🎯 运营商网段随机碰撞' : '📋 每日已测速优选列表'}`);
if (SOURCE_TYPE === 'random') {
    console.log(`   ├─ 运营商段: ${ISP === 'all' ? '🔀 三网大融合(各取' + NODE_COUNT + '个节点)' : ISP}`);
}
console.log(`   ├─ 数量: ${NODE_COUNT} 个`);
const CUSTOM_SOURCE = String(config.CUSTOM_SOURCE || '').trim();
if (CUSTOM_SOURCE) {
    console.log(`   ├─ 自定义优选源: ${CUSTOM_SOURCE}`);
}
console.log(`   └─ 凭据: ${UUID.substring(0, 8)}****** (已脱敏)`);

// ================= 网络请求 Promise 异步包装器 =================
function fetchUrl(url, timeout) {
    return new Promise((resolve) => {
        const request = {
            url: url,
            policy: "DIRECT" // 强制直连
        };
        if (timeout) request.timeout = timeout;

        $httpClient.get(request, function(err, resp, data) {
            if (!err && resp && resp.status === 200 && data) {
                resolve(data);
            } else {
                console.log(`⚠️ [网络获取] 直连拉取源文件失败: ${url}`);
                resolve('');
            }
        });
    });
}

function normalizeCountryCode(country) {
    const code = String(country || '').trim().toUpperCase();
    return /^[A-Z]{2}$/.test(code) ? code : 'UNK';
}

function createIpItem(ip, country, label) {
    return {
        ip: ip,
        country: normalizeCountryCode(country),
        label: label
    };
}

function getRawIp(ip) {
    return String(ip || '').replace(/^\[|\]$/g, '');
}

async function fetchCountryCode(ip) {
    const rawIp = getRawIp(ip);
    const data = await fetchUrl(`https://ipwho.is/${encodeURIComponent(rawIp)}`, 5);
    if (!data) return 'UNK';

    try {
        const result = JSON.parse(data);
        return normalizeCountryCode(result.country_code);
    } catch (e) {
        console.log(`⚠️ [国家识别] 无法解析 IP ${rawIp} 的国家查询结果。`);
        return 'UNK';
    }
}

async function resolveCountryCodes(items) {
    const unknownIps = [...new Set(items
        .filter(item => normalizeCountryCode(item.country) === 'UNK')
        .map(item => item.ip))];

    if (unknownIps.length === 0) return items;

    console.log(`🌍 [国家识别] ${unknownIps.length} 个 IP 未标注国家，正在通过 GeoIP 接口补齐...`);
    const codes = await Promise.all(unknownIps.map(ip => fetchCountryCode(ip)));
    const countryMap = {};
    unknownIps.forEach((ip, idx) => {
        countryMap[ip] = codes[idx];
    });

    return items.map(item => createIpItem(
        item.ip,
        normalizeCountryCode(item.country) === 'UNK' ? countryMap[item.ip] : item.country,
        item.label
    ));
}

function createNodeLink(ip, remarkStr) {
    const remark = encodeURIComponent(remarkStr);

    if (PROTOCOL === 'vless') {
        if (isTls) {
            return `vless://${UUID}@${ip}:${PORT}?security=tls&type=ws&host=${HOST}&sni=${HOST}&path=${encodeURIComponent(PATH)}&encryption=none&fp=chrome#${remark}`;
        }
        return `vless://${UUID}@${ip}:${PORT}?security=none&type=ws&host=${HOST}&path=${encodeURIComponent(PATH)}&encryption=none#${remark}`;
    }

    if (PROTOCOL === 'trojan') {
        if (isTls) {
            return `trojan://${UUID}@${ip}:${PORT}?security=tls&type=ws&host=${HOST}&sni=${HOST}&path=${encodeURIComponent(PATH)}#${remark}`;
        }
        return `trojan://${UUID}@${ip}:${PORT}?security=none&type=ws&host=${HOST}&path=${encodeURIComponent(PATH)}#${remark}`;
    }

    return '';
}

async function appendNodes(nodeLinks, items) {
    const resolvedItems = await resolveCountryCodes(items);
    resolvedItems.forEach(item => {
        const nodeLink = createNodeLink(item.ip, `${item.country}-${item.label}`);
        if (nodeLink) nodeLinks.push(nodeLink);
    });
}

// 辅助函数：根据网段随机生成 IP
function generateRandomIPFromCIDR(cidr) {
    const [baseIP, prefixLength] = cidr.split('/'), prefix = parseInt(prefixLength), hostBits = 32 - prefix;
    const ipInt = baseIP.split('.').reduce((a, p, i) => a | (parseInt(p) << (24 - i * 8)), 0);
    const randomOffset = Math.floor(Math.random() * Math.pow(2, hostBits));
    const mask = (0xFFFFFFFF << hostBits) >>> 0, randomIP = (((ipInt & mask) >>> 0) + randomOffset) >>> 0;
    return [(randomIP >>> 24) & 0xFF, (randomIP >>> 16) & 0xFF, (randomIP >>> 8) & 0xFF, randomIP & 0xFF].join('.');
}

// 辅助网段提取与 IP 碰撞
function extractIpsFromCidrText(text, count) {
    let cidrList = text.replace(/[	"'\r\n]+/g, ',').replace(/,+/g, ',').split(',');
    cidrList = [...new Set(cidrList.map(c => c.trim()).filter(c => c && c.includes('/')))];
    
    if (cidrList.length === 0) cidrList = ['104.16.0.0/13'];
    
    let ips = [];
    for (let i = 0; i < count; i++) {
        const randomCIDR = cidrList[Math.floor(Math.random() * cidrList.length)];
        ips.push(generateRandomIPFromCIDR(randomCIDR));
    }
    return ips;
}

// ================= 主执行异步控制器 =================
async function start() {
    try {
        let nodeLinks = [];

        if (ISP === 'custom') {
            console.log(`🚀 [自定义优选] 检测到选用了自定义源模式，配置为: ${CUSTOM_SOURCE}`);
            let source = CUSTOM_SOURCE.trim();
            if (!source) {
                console.log(`⚠️ [自定义优选] 未填写自定义优选源内容，将自动降级使用 "其他" (zip.cm.edu.kg) 优选源！`);
                source = 'https://zip.cm.edu.kg/all.txt';
            }

            let rawText = '';
            if (source.startsWith('http://') || source.startsWith('https://')) {
                console.log(`📡 [自定义优选] 正在拉取远程自定义 IP 列表: ${source}`);
                rawText = await fetchUrl(source);
                if (!rawText) {
                    console.log(`❌ [自定义优选] 远程拉取失败！无法生成节点。`);
                    returnMockResponse("");
                    return;
                }
            } else {
                console.log(`📝 [自定义优选] 正在直接解析用户输入的本地 IP 列表...`);
                rawText = source;
            }

            let lines = rawText.split(/[,\r\n]+/);
            let pool = [];
            lines.forEach(line => {
                line = line.trim();
                if (!line) return;
                const parts = line.split('#');
                const country = parts[1] ? parts[1].trim() : 'UNK';
                
                let ipv4Match = line.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/);
                if (ipv4Match) {
                    pool.push(createIpItem(ipv4Match[0], country, ''));
                    return;
                }
                
                let ipv6Match = line.match(/\b(?:[a-fA-F0-9]{1,4}:){2,7}[a-fA-F0-9]{1,4}\b/);
                if (ipv6Match) {
                    pool.push(createIpItem(`[${ipv6Match[0]}]`, country, ''));
                    return;
                }
            });

            console.log(`🎯 [自定义优选] 成功提取到 ${pool.length} 个合法 IP。`);
            if (pool.length === 0) {
                console.log(`❌ [自定义优选] 未能解析到任何合法的 IPv4 或 IPv6 地址！`);
                returnMockResponse("");
                return;
            }

            // 截取前 NODE_COUNT 个节点
            let selectedIPs = pool.slice(0, NODE_COUNT);
            
            const ispMark = ISP_NAME_MAP[ISP] || "自定义";
            const modeName = SOURCE_TYPE === 'random' ? '随机' : '列表';
            const items = selectedIPs.map((item, idx) => createIpItem(item.ip, item.country, `${ispMark}-${modeName}-${idx + 1}`));
            await appendNodes(nodeLinks, items);

        } else if (SOURCE_TYPE === 'random') {
            // ================= 🎯 随机碰撞模式 =================
            if (ISP === 'all') {
                // 🚀 【三网大融合模式】四种运营商各自拉取、各自生成 node_count 个节点，瞬间返回！
                const ispTypes = ['cf', 'ct', 'cu', 'cmcc'];
                const urls = [
                    'https://ghproxy.net/https://raw.githubusercontent.com/cmliu/cmliu/main/CF-CIDR.txt',
                    'https://ghproxy.net/https://raw.githubusercontent.com/cmliu/cmliu/main/CF-CIDR/ct.txt',
                    'https://ghproxy.net/https://raw.githubusercontent.com/cmliu/cmliu/main/CF-CIDR/cu.txt',
                    'https://ghproxy.net/https://raw.githubusercontent.com/cmliu/cmliu/main/CF-CIDR/cmcc.txt'
                ];
                
                console.log(`📡 [网络请求] 三网大融合启动，并发拉取 4 大运营商官方网段...`);
                const rawTexts = await Promise.all(urls.map(url => fetchUrl(url)));
                
                let items = [];
                ispTypes.forEach((type, i) => {
                    const text = rawTexts[i];
                    if (!text) {
                        console.log(`⚠️ [融合警告] [${ISP_NAME_MAP[type]}] 列表获取失败，跳过...`);
                        return;
                    }
                    
                    const ips = extractIpsFromCidrText(text, NODE_COUNT);
                    ips.forEach((ip, idx) => {
                        const ispMark = ISP_NAME_MAP[type];
                        items.push(createIpItem(ip, 'UNK', `${ispMark}-随机-${idx + 1}`));
                    });
                });
                await appendNodes(nodeLinks, items);

            } else {
                // 🎯 【单运营商模式】
                const url = (ISP === 'cf' || ISP === 'other')
                    ? 'https://ghproxy.net/https://raw.githubusercontent.com/cmliu/cmliu/main/CF-CIDR.txt'
                    : `https://ghproxy.net/https://raw.githubusercontent.com/cmliu/cmliu/main/CF-CIDR/${ISP}.txt`;
                
                const rawText = await fetchUrl(url);
                if (!rawText) {
                    console.log(`❌ [网络请求] 拉取 [${ISP}] 数据源为空，流程阻断！`);
                    returnMockResponse("");
                    return;
                }
                
                const ips = extractIpsFromCidrText(rawText, NODE_COUNT);
                const ispMark = ISP_NAME_MAP[ISP] || ISP.toUpperCase();
                const items = ips.map((ip, idx) => createIpItem(ip, 'UNK', `${ispMark}-随机-${idx + 1}`));
                await appendNodes(nodeLinks, items);
            }

        } else {
            // ================= 📋 每日已测速优选列表模式 =================
            if (ISP === 'other') {
                // 使用用户指定的超大优质优选 IP 源，支持自适应中国大陆低延迟亚洲节点（HK/TW/JP/SG/KR）优先排布！
                const url = 'https://zip.cm.edu.kg/all.txt';
                const rawText = await fetchUrl(url);
                if (!rawText) {
                    console.log("❌ [网络请求] 拉取已测速优选列表为空，流程阻断！");
                    returnMockResponse("");
                    return;
                }

                let lines = rawText.split('\n');
                let pool = [];
                lines.forEach(line => {
                    line = line.trim();
                    if (!line || line.startsWith('#')) return;
                    
                    // 格式为 IP:PORT#COUNTRY，例如 102.215.228.162:443#DE
                    let parts = line.split('#');
                    let ipPort = parts[0].trim();
                    let country = parts[1] ? parts[1].trim().toUpperCase() : 'UNK';
                    
                    let ip = ipPort.split(':')[0].trim();
                    let ipv4Match = ip.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/);
                    if (ipv4Match) {
                        pool.push(createIpItem(ipv4Match[0], country, ''));
                    }
                });

                // 优先推荐低延迟的亚洲节点（香港、台湾、日本、新加坡、韩国）
                const ASIA_REGIONS = ['HK', 'TW', 'JP', 'SG', 'KR'];
                let asianPool = pool.filter(item => ASIA_REGIONS.includes(item.country));
                let otherPool = pool.filter(item => !ASIA_REGIONS.includes(item.country));
                
                // 随机打乱以保证负载均衡与连接多样性
                asianPool.sort(() => Math.random() - 0.5);
                otherPool.sort(() => Math.random() - 0.5);
                
                let sortedPool = [...asianPool, ...otherPool];
                if (sortedPool.length === 0) {
                    console.log("❌ [解析失败] 提取的 IP 列表为空，无法生成任何节点。");
                    returnMockResponse("");
                    return;
                }

                let selectedItems = sortedPool.slice(0, NODE_COUNT);
                while (selectedItems.length < NODE_COUNT) {
                    selectedItems.push(sortedPool[selectedItems.length % sortedPool.length]);
                }

                console.log(`📋 [干净优选] 提取模式: 其他，从 ${sortedPool.length} 个 IP 中提取前 ${selectedItems.length} 个（优先采用亚洲低延迟节点）`);

                const items = selectedItems.map((item, idx) => createIpItem(item.ip, item.country, `其他-列表-${idx + 1}`));
                await appendNodes(nodeLinks, items);

            } else {
                // 其余运营商逻辑保持不变，采用原有的 vfarid 优选源进行分析
                const url = 'https://ghproxy.net/https://raw.githubusercontent.com/vfarid/cf-clean-ips/main/list.txt';
                const rawText = await fetchUrl(url);
                if (!rawText) {
                    console.log("❌ [网络请求] 拉取已测速优选列表为空，流程阻断！");
                    returnMockResponse("");
                    return;
                }

                let lines = rawText.split('\n');
                let pool = [];
                lines.forEach(line => {
                    line = line.trim();
                    if (!line || line.startsWith('#') || line.toLowerCase().includes('update') || line.toLowerCase().includes('ip')) return;
                    
                    let ipv4Match = line.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/);
                    if (ipv4Match) {
                        pool.push(ipv4Match[0]);
                        return;
                    }
                    
                    let ipv6Match = line.match(/\b(?:[a-fA-F0-9]{1,4}:){2,7}[a-fA-F0-9]{1,4}\b/);
                    if (ipv6Match) {
                        pool.push(`[${ipv6Match[0]}]`);
                        return;
                    }
                });
                
                // 智能节点提取：如果选了 all 模式，截取大池子前 NODE_COUNT * 4 个最顶级的优选 IP 以输出 40 个节点！
                const targetCount = (ISP === 'all') ? (NODE_COUNT * 4) : NODE_COUNT;
                const bestIps = pool.slice(0, targetCount);
                console.log(`📋 [干净优选] 提取模式: ${ISP === 'all' ? '全部(4倍截取)' : ISP}，成功获取前 ${bestIps.length} 个由专业测速排序好的存活 IP`);

                const items = bestIps.map((ip, idx) => {
                    let currentType = ISP;
                    let subIdx = idx + 1;
                    
                    if (ISP === 'all') {
                        const ispTypes = ['cf', 'ct', 'cu', 'cmcc'];
                        const typeIndex = Math.floor(idx / NODE_COUNT);
                        currentType = ispTypes[Math.min(typeIndex, 3)];
                        subIdx = (idx % NODE_COUNT) + 1;
                    }
                    
                    const ispMark = ISP_NAME_MAP[currentType] || currentType.toUpperCase();
                    return createIpItem(ip, 'UNK', `${ispMark}-列表-${subIdx}`);
                });
                await appendNodes(nodeLinks, items);
            }
        }

        if (nodeLinks.length > 0) {
            const resultNodes = nodeLinks.join('\n');
            console.log(`🎉 [节点合成] 成功合成 ${nodeLinks.length} 个最新优选节点！\n==== 合成节点列表 ====\n${resultNodes}\n======================`);
            returnMockResponse(resultNodes);
        } else {
            console.log("❌ [生成失败] 未生成任何有效的节点，请检查网络或数据源！");
            returnMockResponse("");
        }

    } catch (e) {
        console.log("❌ [致命异常] 脚本主流程崩溃: " + e.stack);
        returnMockResponse("");
    }
}

// 启动执行
start();

// 返回 Mock 响应给 Loon
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
                body: "Failed to generate optimized nodes. Please check logs in Loon!"
            }
        });
    }
}
