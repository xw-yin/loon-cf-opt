/**
 * Loon 节点自动生成器与中转器 (合并终极版)
 * 
 * 作用：拦截对虚拟订阅地址 http://httpbin.org/cf_sub 的访问，
 * 直接在本地实时拉取优选 IP 或随机碰撞网段，生成 10 个最快节点并直接返回给 Loon！
 * 完美打通数据链路，彻底消除 Loon 进程隔离导致的缓存不互通问题。
 */

console.log("=== [CF 优选 Loader] 收到订阅获取请求，开始实时生成节点 ===");

// ================= 解析 Loon 插件面板传入的配置参数 =================
function getArguments() {
    let args = {
        UUID: '90cd4a77-141a-43c9-991b-08263cfe9c10', // 默认测试 UUID
        HOST: 'your-worker-domain.com',               // 默认测试域名
        PATH: '/video',                               // 默认测试路径
        PORT: '443',                                  // 默认测试端口
        PROTOCOL: 'vless',                            // 默认测试协议
        SOURCE_TYPE: 'random',                        // 默认使用随机网段模式
        ISP: 'cf'                                     // 默认使用官方优选网段
    };
    
    // 1. 优先尝试从拦截请求的 URL 查询参数中获取（100% 稳定，支持多订阅个性化参数，无视 Loon 插件 Bug）
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
        // === 核心关键：Loon 规范中，argument=[{uuid},{host}] 会将 $argument 注入为真正的 JS 对象！ ===
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
            
            console.log(`✅ [配置解析] 从对象参数中成功提取配置，UUID(脱敏): ${args.UUID.substring(0, 8)}******`);
            return args;
        } 
        
        // === 降级兜底：如果是旧版或特殊的字符串形式，继续执行字符串强力解析 ===
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
        // 关键：兼容 Loon 的标准逗号分隔（,）与常规 URL 传参（&）
        let separator = queryString.includes(',') ? ',' : '&';
        let pairs = queryString.split(separator);
        for (let pair of pairs) {
            let [key, val] = pair.split('=');
            if (key) {
                key = key.trim().toLowerCase(); // 统一转换为小写，彻底消除大小写敏感问题
                val = val ? val.trim() : '';
                
                // 过滤掉未替换的 Loon 占位符字面量（如 {uuid}），防止污染默认值并导致 NaN
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

let PROTOCOL = String(config.PROTOCOL || '').trim().toLowerCase();
if (PROTOCOL !== 'vless' && PROTOCOL !== 'trojan') {
    console.log(`⚠️ [参数修正] 解析到的协议为 "${PROTOCOL}"，非 VLESS/Trojan，已自动纠正并兜底为 "vless"！`);
    PROTOCOL = 'vless';
}

const SOURCE_TYPE = String(config.SOURCE_TYPE || 'random').trim().toLowerCase(); // 'random' 或 'list'
const ISP = String(config.ISP || 'cf').trim().toLowerCase(); // 'cf', 'ct', 'cu', 'cmcc'

console.log(`🔍 [配置解析] 最终参数结果:`);
console.log(`   ├─ 协议: ${PROTOCOL}`);
console.log(`   ├─ 域名: ${HOST}`);
console.log(`   ├─ 路径: ${PATH}`);
console.log(`   ├─ 端口: ${PORT}`);
console.log(`   ├─ 模式: ${SOURCE_TYPE === 'random' ? '🎯 运营商网段随机碰撞' : '📋 每日已测速优选列表'}`);
if (SOURCE_TYPE === 'random') {
    console.log(`   ├─ 运营商段: ${ISP}`);
}
console.log(`   └─ 凭据: ${UUID.substring(0, 8)}****** (已脱敏)`);

// 根据获取模式决定请求 URL
let IP_SOURCE_URL = '';
if (SOURCE_TYPE === 'random') {
    IP_SOURCE_URL = ISP === 'cf' 
        ? 'https://ghproxy.net/https://raw.githubusercontent.com/cmliu/cmliu/main/CF-CIDR.txt'
        : `https://ghproxy.net/https://raw.githubusercontent.com/cmliu/cmliu/main/CF-CIDR/${ISP}.txt`;
} else {
    IP_SOURCE_URL = 'https://ghproxy.net/https://raw.githubusercontent.com/vfarid/cf-clean-ips/main/list.txt';
}

console.log(`📡 [网络请求] 开始直连获取 IP 数据源...`);

$httpClient.get({
    url: IP_SOURCE_URL,
    policy: "DIRECT" // 强制直连
}, function(err, response, data) {
    if (err) {
        console.log("❌ [网络异常] IP 数据源获取失败: " + JSON.stringify(err));
        returnMockResponse(""); // 返回空订阅防止挂起
        return;
    }

    if (response.status === 200 && data) {
        let ipList = [];

        if (SOURCE_TYPE === 'random') {
            // ================= 模式 1：动态随机碰撞网段 =================
            let cidrList = data.replace(/[	"'\r\n]+/g, ',').replace(/,+/g, ',').split(',');
            cidrList = cidrList.map(c => c.trim()).filter(c => c && c.includes('/'));
            
            if (cidrList.length === 0) cidrList = ['104.16.0.0/13'];

            const generateRandomIPFromCIDR = (cidr) => {
                const [baseIP, prefixLength] = cidr.split('/'), prefix = parseInt(prefixLength), hostBits = 32 - prefix;
                const ipInt = baseIP.split('.').reduce((a, p, i) => a | (parseInt(p) << (24 - i * 8)), 0);
                const randomOffset = Math.floor(Math.random() * Math.pow(2, hostBits));
                const mask = (0xFFFFFFFF << hostBits) >>> 0, randomIP = (((ipInt & mask) >>> 0) + randomOffset) >>> 0;
                return [(randomIP >>> 24) & 0xFF, (randomIP >>> 16) & 0xFF, (randomIP >>> 8) & 0xFF, randomIP & 0xFF].join('.');
            };

            for (let i = 0; i < 10; i++) {
                const randomCIDR = cidrList[Math.floor(Math.random() * cidrList.length)];
                ipList.push(generateRandomIPFromCIDR(randomCIDR));
            }
            console.log(`✅ [网段生成] 成功生成 10 个随机优选 IP`);

        } else {
            // ================= 模式 2：每日已测速优选列表 =================
            let lines = data.split('\n');
            lines.forEach(line => {
                line = line.trim();
                if (!line || line.startsWith('#') || line.toLowerCase().includes('update') || line.toLowerCase().includes('ip')) return;
                
                let ipv4Match = line.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/);
                if (ipv4Match) {
                    ipList.push(ipv4Match[0]);
                    return;
                }
                
                let ipv6Match = line.match(/\b(?:[a-fA-F0-9]{1,4}:){2,7}[a-fA-F0-9]{1,4}\b/);
                if (ipv6Match) {
                    ipList.push(`[${ipv6Match[0]}]`);
                    return;
                }
            });
            console.log(`✅ [列表解析] 成功解析提取 ${ipList.length} 个优选 IP`);
        }

        if (ipList.length > 0) {
            let bestIPs = ipList.slice(0, 10);
            let nodeLinks = [];
            const modeRemark = SOURCE_TYPE === 'random' ? `CF-${ISP.toUpperCase()}-随机` : 'CF优选';

            bestIPs.forEach((ip, index) => {
                let nodeLink = '';
                let remark = encodeURIComponent(`${modeRemark}-${index + 1}`);

                if (PROTOCOL === 'vless') {
                    nodeLink = `vless://${UUID}@${ip}:${PORT}?security=tls&type=ws&host=${HOST}&sni=${HOST}&path=${encodeURIComponent(PATH)}&encryption=none&fp=chrome#${remark}`;
                } else if (PROTOCOL === 'trojan') {
                    nodeLink = `trojan://${UUID}@${ip}:${PORT}?security=tls&type=ws&host=${HOST}&sni=${HOST}&path=${encodeURIComponent(PATH)}#${remark}`;
                }

                if (nodeLink) nodeLinks.push(nodeLink);
            });

            const resultNodes = nodeLinks.join('\n');
            
            console.log(`🎉 [节点合成] 成功合成 ${nodeLinks.length} 个最新优选节点！\n==== 合成节点列表 ====\n${resultNodes}\n======================`);
            returnMockResponse(resultNodes);
        } else {
            console.log("❌ [解析失败] IP 列表为空");
            returnMockResponse("");
        }
    } else {
        console.log("❌ [服务器响应异常] 状态码: " + response.status);
        returnMockResponse("");
    }
});

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
