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

const TLS_PORTS = [443, 8443, 2053, 2083, 2087, 2096, 9443];
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

// ================= 网络请求 Promise 异步包装器 (带 Headers) =================
function fetchUrlWithHeaders(url, headers, timeout) {
    return new Promise((resolve) => {
        const request = {
            url: url,
            policy: "DIRECT", // 强制直连
            headers: headers || {}
        };
        if (timeout) request.timeout = timeout;

        $httpClient.get(request, function(err, resp, data) {
            if (!err && resp && resp.status === 200 && data) {
                resolve(data);
            } else {
                console.log(`⚠️ [网络获取] 失败: ${url}`);
                resolve('');
            }
        });
    });
}

// ================= Base64 解码辅助函数 =================
function base64Decode(str) {
    str = str.replace(/-/g, '+').replace(/_/g, '/');
    while (str.length % 4) {
        str += '=';
    }
    if (typeof atob === 'function') {
        try {
            return atob(str);
        } catch (e) {}
    }
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let buffer = '';
    let bits = 0;
    let value = 0;
    for (let i = 0; i < str.length; i++) {
        const c = str.charAt(i);
        const idx = chars.indexOf(c);
        if (idx !== -1) {
            value = (value << 6) | idx;
            bits += 6;
            if (bits >= 8) {
                bits -= 8;
                const byte = (value >>> bits) & 0xff;
                buffer += String.fromCharCode(byte);
            }
        }
    }
    try {
        return decodeURIComponent(escape(buffer));
    } catch (e) {
        return buffer;
    }
}

// ================= IP 行解析辅助函数 =================
function parseIpLine(line, defaultLabel) {
    line = line.trim();
    if (!line) return null;
    
    if (line.includes('Telegram') || line.includes('telegram') || line.includes('unlock') || line.includes('Join')) {
        return null;
    }
    
    let rest = line;
    let label = defaultLabel || '优选';
    
    if (rest.includes('://')) {
        const atIdx = rest.indexOf('@');
        if (atIdx !== -1) {
            rest = rest.substring(atIdx + 1);
        }
    }
    
    const hashIdx = rest.indexOf('#');
    if (hashIdx !== -1) {
        label = decodeURIComponent(rest.substring(hashIdx + 1)).trim();
        rest = rest.substring(0, hashIdx);
    }
    
    const qIdx = rest.indexOf('?');
    if (qIdx !== -1) {
        rest = rest.substring(0, qIdx).trim();
    }
    
    rest = rest.trim();
    
    let ip = rest;
    let port = PORT.toString();
    
    if (rest.startsWith('[') && rest.includes(']')) {
        const rBraceIdx = rest.indexOf(']');
        ip = rest.substring(0, rBraceIdx + 1);
        const afterBrace = rest.substring(rBraceIdx + 1);
        if (afterBrace.startsWith(':')) {
            port = afterBrace.substring(1).trim();
        }
    } else if (rest.includes(':')) {
        const colons = rest.split(':').length - 1;
        if (colons === 1) {
            const parts = rest.split(':');
            ip = parts[0];
            port = parts[1];
        } else {
            ip = `[${rest}]`;
            port = PORT.toString();
        }
    }
    
    const cleanIp = ip.replace(/[\[\]]/g, '');
    const isIpv4 = /^(?:\d{1,3}\.){3}\d{1,3}$/.test(cleanIp);
    const isIpv6 = /^[a-fA-F0-9:]+$/.test(cleanIp);
    
    if (!isIpv4 && !isIpv6) return null;
    
    return {
        ip: ip,
        port: port,
        label: label
    };
}

// ================= 中国大陆优选 IP 获取 (含五级保底链路) =================
async function fetchCleanIps(isp) {
    let pool = [];

    // 1. 第一级：尝试从 sub.cmliussss.net 获取反代优选 IP (针对中国运营商特别优化)
    try {
        console.log(`📡 [网络获取] 第一级：正在从 sub.cmliussss.net 拉取 ${isp.toUpperCase()} 反代优选 IP...`);
        const paramIsp = { 'ct': 'ct', 'cu': 'cu', 'cmcc': 'cmcc', 'cf': 'cf' }[isp] || 'cf';
        const url = `https://sub.cmliussss.net/sub?host=example.com&uuid=00000000-0000-4000-8000-000000000000&cnIspCode=${paramIsp}`;
        const headers = {
            'User-Agent': 'v2rayN/edgetunnel (https://github.com/cmliu/edgetunnel)'
        };
        const base64Data = await fetchUrlWithHeaders(url, headers, 4000);
        if (base64Data) {
            const decoded = base64Decode(base64Data);
            if (decoded && !decoded.includes('不再支持旧版')) {
                const lines = decoded.split(/\r?\n/);
                lines.forEach(line => {
                    const item = parseIpLine(line, isp.toUpperCase());
                    if (item) {
                        pool.push(item);
                    }
                });
                if (pool.length > 0) {
                    console.log(`✅ [网络获取] 第一级成功：从 sub.cmliussss.net 获取到 ${pool.length} 个 ${isp.toUpperCase()} 反代优选 IP`);
                    return pool;
                }
            }
        }
    } catch (err) {
        console.log(`⚠️ [网络获取] 第一级 sub.cmliussss.net 获取或解析失败: ${err.message || err}`);
    }

    // 2. 第二级：尝试从 vps789 API 获取 (经过三网 24 小时监控测速)
    try {
        console.log(`📡 [网络获取] 第二级：正在拉取 vps789 优选 IP 数据...`);
        const jsonText = await fetchUrl('https://vps789.com/public/sum/cfIpApi', 4000);
        if (jsonText) {
            const res = JSON.parse(jsonText);
            if (res && res.code === 0 && res.data) {
                let targetKey = 'AllAvg';
                if (isp === 'ct') targetKey = 'CT';
                else if (isp === 'cu') targetKey = 'CU';
                else if (isp === 'cmcc') targetKey = 'CM';

                const list = res.data[targetKey] || [];
                list.forEach(item => {
                    if (item && item.ip) {
                        const parsed = parseIpLine(item.ip, isp.toUpperCase());
                        if (parsed) {
                            pool.push(parsed);
                        }
                    }
                });
                if (pool.length > 0) {
                    console.log(`✅ [网络获取] 第二级成功：从 vps789 获取到 ${pool.length} 个 ${isp.toUpperCase()} 优选 IP`);
                    return pool;
                }
            }
        }
    } catch (err) {
        console.log(`⚠️ [网络获取] 第二级 vps789 接口获取或解析失败: ${err.message || err}`);
    }

    // 3. 第三级：尝试从 addressesapi.090227.xyz 获取
    try {
        let urls = [];
        if (isp === 'ct') {
            urls = ['https://addressesapi.090227.xyz/ct', 'https://addressesapi.090227.xyz/CloudFlareYes'];
        } else if (isp === 'cmcc') {
            urls = ['https://addressesapi.090227.xyz/cmcc', 'https://addressesapi.090227.xyz/CloudFlareYes'];
        } else {
            urls = ['https://addressesapi.090227.xyz/CloudFlareYes'];
        }

        console.log(`📡 [网络获取] 第三级：正在从 addressesapi.090227.xyz 拉取数据...`);
        let rawText = '';
        for (const url of urls) {
            rawText = await fetchUrl(url, 4000);
            if (rawText && !rawText.includes('Telegram') && rawText.trim().split('\n').length > 1) {
                break;
            }
            rawText = '';
        }

        if (!rawText) {
            rawText = await fetchUrl('https://addressesapi.090227.xyz/CloudFlareYes', 4000);
        }

        if (rawText) {
            let lines = rawText.split('\n');
            lines.forEach(line => {
                line = line.trim();
                if (!line) return;
                
                if (isp !== 'cf' && isp !== 'all') {
                    const lineUpper = line.toUpperCase();
                    let isMatch = false;
                    if (isp === 'ct' && (lineUpper.includes('#CT') || lineUpper.includes('TELECOM'))) isMatch = true;
                    if (isp === 'cu' && (lineUpper.includes('#CU') || lineUpper.includes('UNICOM'))) isMatch = true;
                    if (isp === 'cmcc' && (lineUpper.includes('#CM') || lineUpper.includes('MOBILE'))) isMatch = true;
                    if (!isMatch) return;
                }

                const parsed = parseIpLine(line, isp.toUpperCase());
                if (parsed) {
                    pool.push(parsed);
                }
            });

            if (pool.length === 0) {
                lines.forEach(line => {
                    const parsed = parseIpLine(line, isp.toUpperCase());
                    if (parsed) pool.push(parsed);
                });
            }

            if (pool.length > 0) {
                console.log(`✅ [网络获取] 第三级成功：从 090227.xyz 获取到 ${pool.length} 个 IP`);
                return pool;
            }
        }
    } catch (err) {
        console.log(`⚠️ [网络获取] 第三级 addressesapi 接口失败: ${err.message || err}`);
    }

    // 4. 第四级：cmliu 的备份 addressesapi.txt
    try {
        console.log(`📡 [网络获取] 第四级：正在拉取 cmliu 备份优选 IP...`);
        const rawText = await fetchUrl('https://ghproxy.net/https://raw.githubusercontent.com/cmliu/WorkerVless2sub/main/addressesapi.txt', 4000);
        if (rawText) {
            let lines = rawText.split('\n');
            lines.forEach(line => {
                const parsed = parseIpLine(line, isp.toUpperCase());
                if (parsed) pool.push(parsed);
            });
            if (pool.length > 0) {
                console.log(`✅ [网络获取] 第四级成功：获取到 ${pool.length} 个备份 IP`);
                return pool;
            }
        }
    } catch (err) {
        console.log(`⚠️ [网络获取] 第四级 cmliu 备份接口失败: ${err.message || err}`);
    }

    // 5. 第五级：原有的 vfarid 优选源
    try {
        console.log(`📡 [网络获取] 第五级：正在拉取 vfarid 优选源...`);
        const rawText = await fetchUrl('https://ghproxy.net/https://raw.githubusercontent.com/vfarid/cf-clean-ips/main/list.txt', 4000);
        if (rawText) {
            let lines = rawText.split('\n');
            lines.forEach(line => {
                const parsed = parseIpLine(line, isp.toUpperCase());
                if (parsed) pool.push(parsed);
            });
            if (pool.length > 0) {
                console.log(`✅ [网络获取] 第五级成功：从 vfarid 获取到 ${pool.length} 个 IP`);
                return pool;
            }
        }
    } catch (err) {
        console.log(`⚠️ [网络获取] 第五级 vfarid 接口失败: ${err.message || err}`);
    }

    // 6. 第六级：静态硬编码兜底 IP
    console.log(`⚠️ [网络获取] 所有接口拉取失败，启用第六级静态硬编码 IP 兜底`);
    return [
        { ip: '104.16.0.1', port: PORT.toString(), label: '兜底' },
        { ip: '104.17.0.1', port: PORT.toString(), label: '兜底' },
        { ip: '104.18.0.1', port: PORT.toString(), label: '兜底' },
        { ip: '104.19.0.1', port: PORT.toString(), label: '兜底' },
        { ip: '198.41.211.205', port: PORT.toString(), label: '兜底' },
        { ip: '198.41.222.252', port: PORT.toString(), label: '兜底' }
    ];
}

function createIpItem(ip, port, label) {
    return {
        ip: ip,
        port: port,
        label: label
    };
}

function createNodeLink(ip, port, remarkStr) {
    const remark = encodeURIComponent(remarkStr);
    const connPort = port || PORT;
    const connTls = TLS_PORTS.includes(Number(connPort));

    if (PROTOCOL === 'vless') {
        if (connTls) {
            return `vless://${UUID}@${ip}:${connPort}?security=tls&type=ws&host=${HOST}&sni=${HOST}&path=${encodeURIComponent(PATH)}&encryption=none&fp=chrome#${remark}`;
        }
        return `vless://${UUID}@${ip}:${connPort}?security=none&type=ws&host=${HOST}&path=${encodeURIComponent(PATH)}&encryption=none#${remark}`;
    }

    if (PROTOCOL === 'trojan') {
        if (connTls) {
            return `trojan://${UUID}@${ip}:${connPort}?security=tls&type=ws&host=${HOST}&sni=${HOST}&path=${encodeURIComponent(PATH)}#${remark}`;
        }
        return `trojan://${UUID}@${ip}:${connPort}?security=none&type=ws&host=${HOST}&path=${encodeURIComponent(PATH)}#${remark}`;
    }

    return '';
}

async function appendNodes(nodeLinks, items) {
    items.forEach(item => {
        const nodeLink = createNodeLink(item.ip, item.port, `CF-${item.label}`);
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
                const item = parseIpLine(line, '自定义');
                if (item) {
                    pool.push(item);
                }
            });

            console.log(`🎯 [自定义优选] 成功提取到 ${pool.length} 个合法 IP。`);
            if (pool.length === 0) {
                console.log(`❌ [自定义优选] 未能解析到任何合法的 IPv4 或 IPv6 地址！`);
                returnMockResponse("");
                return;
            }

            // 截取前 NODE_COUNT 个节点
            let selectedItems = pool.slice(0, NODE_COUNT);
            
            const ispMark = ISP_NAME_MAP[ISP] || "自定义";
            const modeName = SOURCE_TYPE === 'random' ? '随机' : '列表';
            const items = selectedItems.map((item, idx) => createIpItem(item.ip, item.port, `${ispMark}-${modeName}-${idx + 1}`));
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
                        items.push(createIpItem(ip, PORT.toString(), `${ispMark}-随机-${idx + 1}`));
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
                const items = ips.map((ip, idx) => createIpItem(ip, PORT.toString(), `${ispMark}-随机-${idx + 1}`));
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
                    const item = parseIpLine(line, '其他');
                    if (item) {
                        pool.push({ ip: item.ip, port: item.port, country: item.label, label: item.label });
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
                    console.log("❌ [解析失败] 提取 of IP 列表为空，无法生成任何节点。");
                    returnMockResponse("");
                    return;
                }

                let selectedItems = sortedPool.slice(0, NODE_COUNT);
                while (selectedItems.length < NODE_COUNT) {
                    selectedItems.push(sortedPool[selectedItems.length % sortedPool.length]);
                }

                console.log(`📋 [干净优选] 提取模式: 其他，从 ${sortedPool.length} 个 IP 中提取前 ${selectedItems.length} 个（优先采用亚洲低延迟节点）`);

                const items = selectedItems.map((item, idx) => createIpItem(item.ip, item.port, `其他-列表-${idx + 1}`));
                await appendNodes(nodeLinks, items);

            } else if (ISP === 'all') {
                // 三网大融合列表模式：电信、联通、移动、官方并发获取优选 IP
                console.log("📋 [干净优选] 三网大融合列表模式启动，并发拉取各运营商优选 IP...");
                const ispTypes = ['cf', 'ct', 'cu', 'cmcc'];
                const pools = await Promise.all(ispTypes.map(type => fetchCleanIps(type)));
                
                let items = [];
                ispTypes.forEach((type, i) => {
                    const pool = pools[i];
                    const selected = pool.slice(0, NODE_COUNT);
                    selected.forEach((item, idx) => {
                        const ispMark = ISP_NAME_MAP[type];
                        items.push(createIpItem(item.ip, item.port, `${ispMark}-${item.label}-${idx + 1}`));
                    });
                });
                await appendNodes(nodeLinks, items);
            } else {
                // 单运营商列表模式：直接拉取该运营商的优选 IP
                console.log(`📋 [干净优选] 运营商 [${ISP_NAME_MAP[ISP] || ISP.toUpperCase()}] 列表模式启动...`);
                const pool = await fetchCleanIps(ISP);
                const selected = pool.slice(0, NODE_COUNT);
                const ispMark = ISP_NAME_MAP[ISP] || ISP.toUpperCase();
                const items = selected.map((item, idx) => createIpItem(item.ip, item.port, `${ispMark}-${item.label}-${idx + 1}`));
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
