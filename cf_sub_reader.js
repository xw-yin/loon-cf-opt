/**
 * Loon 节点自动生成器与本地测速中转器 (三网融合高规版)
 * 
 * 作用：拦截对虚拟订阅地址 http://httpbin.org/cf_sub 的访问，
 * 100% 在本地并发拉取优选网段，实时进行 TCP/HTTPS 测速排序，
 * 并通过 Cloudflare Colo 诊断信息自动汉化地区命名，提取最快节点返回！
 */

console.log("=== [CF 优选 Loader] 收到订阅获取请求，开始实时生成节点 ===");

// 热门 Cloudflare 数据中心三字码 (Colocation) 地区汉化字典
const COLO_MAP = {
    "HKG": "🇨🇳香港", "TPE": "🇨🇳台湾", "NRT": "🇯🇵东京", "KIX": "🇯🇵大阪", "ICN": "🇰🇷首尔", "SIN": "🇸🇬新加坡",
    "LAX": "🇺🇸洛杉矶", "SJC": "🇺🇸圣何塞", "SFO": "🇺🇸旧金山", "SEA": "🇺🇸西雅图", "ORD": "🇺🇸芝加哥",
    "DFW": "🇺🇸达拉斯", "IAD": "🇺🇸华盛顿", "JFK": "🇺🇸纽约", "MIA": "🇺🇸迈阿密", "LHR": "🇬🇧伦敦",
    "FRA": "🇩🇪法兰克福", "CDG": "🇫🇷巴黎", "AMS": "🇳🇱阿姆斯特丹", "ARN": "🇸🇪斯德哥尔摩", "SYD": "🇦🇺悉尼",
    "MEL": "🇦🇺墨尔本", "BKK": "🇹🇭曼谷", "KUL": "🇲🇾吉隆坡", "MNL": "🇵🇭马尼拉", "JKT": "🇮🇩雅加达",
    "SGN": "🇻🇳胡志明市", "DEL": "🇮🇳新德里", "BOM": "🇮🇳孟买", "DXB": "🇦🇪迪拜"
};

// 运营商 Remarks 标识映射
const ISP_NAME_MAP = {
    "cf": "官方",
    "ct": "电信",
    "cu": "联通",
    "cmcc": "移动"
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
        NODE_COUNT: '10'                              // 默认生成 10 个节点
    };
    
    // 1. 优先尝试从拦截请求的 URL 查询参数中获取（支持多订阅个性化参数，无视 Loon 插件 Bug）
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
    
    // 3. 执行兼容性字符串参数解析 (URL 参数或旧版 String $argument)
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
    console.log(`   ├─ 运营商段: ${ISP === 'all' ? '🔀 三网大融合(各取' + NODE_COUNT + '个最快节点)' : ISP}`);
}
console.log(`   ├─ 数量: ${NODE_COUNT} 个`);
console.log(`   └─ 凭据: ${UUID.substring(0, 8)}****** (已脱敏)`);

// ================= 网络请求 Promise 异步包装器 =================
function fetchUrl(url) {
    return new Promise((resolve) => {
        $httpClient.get({
            url: url,
            policy: "DIRECT" // 强直连获取数据源
        }, function(err, resp, data) {
            if (!err && resp && resp.status === 200 && data) {
                resolve(data);
            } else {
                console.log(`⚠️ [网络获取] 直连拉取源文件失败: ${url}`);
                resolve('');
            }
        });
    });
}

// ================= 本地并发测速与 Colo 归属查询 Promise 引擎 =================
function testIP(ip) {
    return new Promise((resolve) => {
        const startTime = Date.now();
        
        // 统一且必须使用官方特许测速域名 1.1.1.1 作为 Host，以防用户自定义域名触发 301/403 阻断！
        // 关键点：必须在 Headers 中加入合法的 iOS 浏览器 User-Agent 头部伪装，
        // 否则 Cloudflare 会将其判定为恶意机器人自动化流量，并直接返回 403 Forbidden 阻断测速！
        const targetHost = '1.1.1.1';
        
        $httpClient.get({
            url: `http://${ip}/cdn-cgi/trace`,
            headers: {
                "Host": targetHost,
                "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1"
            },
            timeout: 3000, // 3 秒超时限制，完美兼顾无线移动网络波动，防止因建连慢被误杀
            policy: "DIRECT" // 必须直连以捕获物理真实延迟
        }, function(err, resp, data) {
            const latency = Date.now() - startTime;
            if (!err && resp && resp.status === 200 && data) {
                let colo = "UNK";
                const match = data.match(/colo=([A-Z]{3})/);
                if (match && match[1]) {
                    colo = match[1];
                }
                resolve({ ip: ip, latency: latency, colo: colo, success: true, error: null });
            } else {
                let errorMsg = "超时/阻断";
                if (err) errorMsg = typeof err === 'object' ? JSON.stringify(err) : String(err);
                else if (resp) errorMsg = `HTTP 状态码 ${resp.status}`;
                resolve({ ip: ip, latency: 9999, colo: "ERR", success: false, error: errorMsg });
            }
        });
    });
}

// 解析文本中的 IP/CIDR 网段，随机生成候选 IP
function parseAndGenerateCandidates(rawText, countToGenerate) {
    let cidrList = rawText.replace(/[	"'\r\n]+/g, ',').replace(/,+/g, ',').split(',');
    cidrList = [...new Set(cidrList.map(c => c.trim()).filter(c => c && c.includes('/')))];
    
    if (cidrList.length === 0) cidrList = ['104.16.0.0/13'];

    const generateRandomIPFromCIDR = (cidr) => {
        const [baseIP, prefixLength] = cidr.split('/'), prefix = parseInt(prefixLength), hostBits = 32 - prefix;
        const ipInt = baseIP.split('.').reduce((a, p, i) => a | (parseInt(p) << (24 - i * 8)), 0);
        const randomOffset = Math.floor(Math.random() * Math.pow(2, hostBits));
        const mask = (0xFFFFFFFF << hostBits) >>> 0, randomIP = (((ipInt & mask) >>> 0) + randomOffset) >>> 0;
        return [(randomIP >>> 24) & 0xFF, (randomIP >>> 16) & 0xFF, (randomIP >>> 8) & 0xFF, randomIP & 0xFF].join('.');
    };

    let candidates = [];
    for (let i = 0; i < countToGenerate; i++) {
        const randomCIDR = cidrList[Math.floor(Math.random() * cidrList.length)];
        candidates.push(generateRandomIPFromCIDR(randomCIDR));
    }
    return candidates;
}

// 核心处理函数：对给定的候选 IP 集合进行并发测速、排序并筛选出最快节点
async function processAndBenchmark(candidates, ispType, maxToSelect) {
    console.log(`⚡ [测速引擎] [${ISP_NAME_MAP[ispType] || ispType}] 准备对 ${candidates.length} 个候选 IP 发起本地 HTTPS 并发测速...`);
    const testResults = await Promise.all(candidates.map(ip => testIP(ip)));
    
    // 详细打印所有候选 IP 测速明细，方便直观排查和观测！
    console.log(`📊 === [${ISP_NAME_MAP[ispType] || ispType}] 测速明细日志 ===`);
    testResults.forEach(r => {
        const latencyStr = r.success ? `${r.latency}ms` : "超时/失败";
        const resultIndicator = r.success ? `✅ 成功` : `❌ 失败 (${r.error})`;
        console.log(`   ├─ IP: ${r.ip.padEnd(15)} | 延迟: ${latencyStr.padEnd(8)} | 机房: ${r.colo.padEnd(4)} | 结果: ${resultIndicator}`);
    });
    console.log(`===========================================`);

    // 筛选成功的测速结果，并按延迟从低到高升序排序
    const successfulResults = testResults.filter(r => r.success).sort((a, b) => a.latency - b.latency);
    console.log(`📈 [测速排序] [${ISP_NAME_MAP[ispType] || ispType}] 测速完成！其中可用 IP 数为: ${successfulResults.length} 个`);

    let finalResults = [];
    if (successfulResults.length > 0) {
        finalResults = successfulResults.slice(0, maxToSelect);
    } else {
        // 自愈兜底保护逻辑：如果全部超时，直接采用最初生成的候选 IP 列表，将延迟标为 999 兜底
        console.log(`⚠️ [自愈兜底] [${ISP_NAME_MAP[ispType] || ispType}] 所有候选 IP 本地测速均超时/失效！已启动自愈兜底机制...`);
        candidates.slice(0, maxToSelect).forEach((ip) => {
            finalResults.push({ ip: ip, latency: 999, colo: "兜底", success: false });
        });
    }
    
    return finalResults;
}

// ================= 主执行异步控制器 =================
async function start() {
    try {
        let nodeLinks = [];

        if (SOURCE_TYPE === 'random') {
            // ================= 🎯 随机碰撞模式 =================
            if (ISP === 'all') {
                // 🚀 【超级混合三网大融合模式】四种类型各并发获取、各抽取 node_count 个最快 IP！
                const ispTypes = ['cf', 'ct', 'cu', 'cmcc'];
                const urls = [
                    'https://ghproxy.net/https://raw.githubusercontent.com/cmliu/cmliu/main/CF-CIDR.txt',
                    'https://ghproxy.net/https://raw.githubusercontent.com/cmliu/cmliu/main/CF-CIDR/ct.txt',
                    'https://ghproxy.net/https://raw.githubusercontent.com/cmliu/cmliu/main/CF-CIDR/cu.txt',
                    'https://ghproxy.net/https://raw.githubusercontent.com/cmliu/cmliu/main/CF-CIDR/cmcc.txt'
                ];
                
                console.log(`📡 [网络请求] 三网大融合模式启动，并发拉取 4 大运营商网段列表...`);
                const rawTexts = await Promise.all(urls.map(url => fetchUrl(url)));
                
                // 并发执行四路测速流程
                const benchmarkPromises = ispTypes.map(async (type, i) => {
                    const text = rawTexts[i];
                    if (!text) {
                        console.log(`⚠️ [大融合警告] 抓取 [${ISP_NAME_MAP[type]}] 网段列表为空，跳过此运营商测速...`);
                        return [];
                    }
                    
                    // 各自生成目标数量 2 倍的备选 IP 进行高效测速（比如设置 10 个就生成 20 个测速）
                    const candidatesToGenerate = Math.min(NODE_COUNT * 2, 25);
                    const candidates = parseAndGenerateCandidates(text, candidatesToGenerate);
                    
                    const bestIps = await processAndBenchmark(candidates, type, NODE_COUNT);
                    return bestIps.map(res => ({ ...res, ispType: type }));
                });
                
                const allBestIpsArray = await Promise.all(benchmarkPromises);
                // 扁平合并四个运营商的最优 IP
                const mergedBestIps = [].concat(...allBestIpsArray);
                
                // 拼接节点
                mergedBestIps.forEach((res, index) => {
                    let nodeLink = '';
                    const ispMark = ISP_NAME_MAP[res.ispType] || res.ispType.toUpperCase();
                    const region = COLO_MAP[res.colo] || `CF-${res.colo}`;
                    
                    // 纯净的地区+运营商名+序号，完美符合正则表达式匹配，去除了延迟数字
                    const remarkStr = `${region}-CF-${ispMark}-${index + 1}`;
                    const remark = encodeURIComponent(remarkStr);

                    if (PROTOCOL === 'vless') {
                        nodeLink = `vless://${UUID}@${res.ip}:${PORT}?security=tls&type=ws&host=${HOST}&sni=${HOST}&path=${encodeURIComponent(PATH)}&encryption=none&fp=chrome#${remark}`;
                    } else if (PROTOCOL === 'trojan') {
                        nodeLink = `trojan://${UUID}@${res.ip}:${PORT}?security=tls&type=ws&host=${HOST}&sni=${HOST}&path=${encodeURIComponent(PATH)}#${remark}`;
                    }
                    if (nodeLink) nodeLinks.push(nodeLink);
                });

            } else {
                // 🎯 【单运营商模式】
                const url = ISP === 'cf' 
                    ? 'https://ghproxy.net/https://raw.githubusercontent.com/cmliu/cmliu/main/CF-CIDR.txt'
                    : `https://ghproxy.net/https://raw.githubusercontent.com/cmliu/cmliu/main/CF-CIDR/${ISP}.txt`;
                
                const rawText = await fetchUrl(url);
                if (!rawText) {
                    console.log(`❌ [网络请求] 拉取运营商 [${ISP}] 数据源为空，流程阻断！`);
                    returnMockResponse("");
                    return;
                }
                
                const candidatesToGenerate = Math.min(NODE_COUNT * 3, 40);
                const candidates = parseAndGenerateCandidates(rawText, candidatesToGenerate);
                
                const bestIps = await processAndBenchmark(candidates, ISP, NODE_COUNT);
                
                bestIps.forEach((res, index) => {
                    let nodeLink = '';
                    const region = COLO_MAP[res.colo] || `CF-${res.colo}`;
                    const remarkStr = `${region}-CF-${ISP.toUpperCase()}-${index + 1}`;
                    const remark = encodeURIComponent(remarkStr);

                    if (PROTOCOL === 'vless') {
                        nodeLink = `vless://${UUID}@${res.ip}:${PORT}?security=tls&type=ws&host=${HOST}&sni=${HOST}&path=${encodeURIComponent(PATH)}&encryption=none&fp=chrome#${remark}`;
                    } else if (PROTOCOL === 'trojan') {
                        nodeLink = `trojan://${UUID}@${res.ip}:${PORT}?security=tls&type=ws&host=${HOST}&sni=${HOST}&path=${encodeURIComponent(PATH)}#${remark}`;
                    }
                    if (nodeLink) nodeLinks.push(nodeLink);
                });
            }

        } else {
            // ================= 📋 每日已测速优选列表模式 =================
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
            
            const candidatesToSelect = Math.min(NODE_COUNT * 3, 40);
            const candidates = pool.slice(0, candidatesToSelect);
            
            const bestIps = await processAndBenchmark(candidates, "list", NODE_COUNT);
            
            bestIps.forEach((res, index) => {
                let nodeLink = '';
                const region = COLO_MAP[res.colo] || `CF-${res.colo}`;
                const remarkStr = `${region}-CF优选-${index + 1}`;
                const remark = encodeURIComponent(remarkStr);

                if (PROTOCOL === 'vless') {
                    nodeLink = `vless://${UUID}@${res.ip}:${PORT}?security=tls&type=ws&host=${HOST}&sni=${HOST}&path=${encodeURIComponent(PATH)}&encryption=none&fp=chrome#${remark}`;
                } else if (PROTOCOL === 'trojan') {
                    nodeLink = `trojan://${UUID}@${res.ip}:${PORT}?security=tls&type=ws&host=${HOST}&sni=${HOST}&path=${encodeURIComponent(PATH)}#${remark}`;
                }
                if (nodeLink) nodeLinks.push(nodeLink);
            });
        }

        if (nodeLinks.length > 0) {
            const resultNodes = nodeLinks.join('\n');
            console.log(`🎉 [节点合成] 成功合成 ${nodeLinks.length} 个最强优选节点！\n==== 合成节点列表 ====\n${resultNodes}\n======================`);
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
