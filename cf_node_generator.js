/**
 * Loon 脚本订阅：自动拉取优选 IP 或动态随机碰撞网段并直接在本地生成代理节点
 * 支持双模式：1. 每日优选列表拉取 2. 运营商专属 CIDR 随机碰撞网段生成
 */

console.log("=== [CF 优选生成器] 脚本启动 ===");

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
    
    if (typeof $argument !== 'undefined' && $argument) {
        console.log("📝 [配置解析] 收到 Loon 面板传入的原始参数: " + $argument);
        let pairs = $argument.split('&');
        for (let pair of pairs) {
            let [key, val] = pair.split('=');
            if (key && val) {
                args[key] = decodeURIComponent(val);
            }
        }
    } else {
        console.log("⚠️ [配置解析] 未检测到 Loon 面板传入的参数，将使用默认测试配置运行！");
    }
    return args;
}

const config = getArguments();
const UUID = config.UUID;
const HOST = config.HOST;
const PATH = config.PATH;
const PORT = Number(config.PORT || 443);
const PROTOCOL = config.PROTOCOL.toLowerCase();
const SOURCE_TYPE = config.SOURCE_TYPE.toLowerCase(); // 'random' 或 'list'
const ISP = config.ISP.toLowerCase(); // 'cf', 'ct', 'cu', 'cmcc'

const TLS_PORTS = [443, 8443, 2053, 2083, 2087, 2096];
const isTls = TLS_PORTS.includes(PORT);

// 运营商 Remarks 标识映射
const ISP_NAME_MAP = {
    "cf": "官方",
    "ct": "电信",
    "cu": "联通",
    "cmcc": "移动",
    "other": "其他"
};

console.log(`🔍 [配置解析] 最终参数结果:`);
console.log(`   ├─ 协议: ${PROTOCOL}`);
console.log(`   ├─ 域名: ${HOST}`);
console.log(`   ├─ 路径: ${PATH}`);
console.log(`   ├─ 端口: ${PORT}`);
console.log(`   ├─ 模式: ${SOURCE_TYPE === 'random' ? '🎯 运营商专属网段随机生成' : '📋 每日已测速优选列表'}`);
if (SOURCE_TYPE === 'random') {
    const ispName = { cf: '官方优选', ct: '电信优选', cu: '联通优选', cmcc: '移动优选', other: '其他优选' }[ISP];
    console.log(`   ├─ 运营商段: ${ispName} (${ISP})`);
}
console.log(`   └─ 凭据: ${UUID.substring(0, 8)}****** (已进行脱敏处理)`);

// 根据获取模式决定请求 URL
let IP_SOURCE_URL = '';
if (SOURCE_TYPE === 'random') {
    // 随机模式，获取指定运营商的 CIDR 网段列表
    IP_SOURCE_URL = (ISP === 'cf' || ISP === 'other')
        ? 'https://ghproxy.net/https://raw.githubusercontent.com/cmliu/cmliu/main/CF-CIDR.txt'
        : `https://ghproxy.net/https://raw.githubusercontent.com/cmliu/cmliu/main/CF-CIDR/${ISP}.txt`;
} else {
    // 列表模式，拉取每日测速后的 IP
    IP_SOURCE_URL = ISP === 'other'
        ? 'https://zip.cm.edu.kg/all.txt'
        : 'https://ghproxy.net/https://raw.githubusercontent.com/vfarid/cf-clean-ips/main/list.txt';
}

console.log(`📡 [网络请求] 开始通过直连 (DIRECT) 路由获取 IP 数据源...`);
console.log(`   └─ 目标 URL: ${IP_SOURCE_URL}`);

$httpClient.get({
    url: IP_SOURCE_URL,
    policy: "DIRECT" // 强制走直连
}, function(err, response, data) {
    console.log("📡 [网络请求] 请求完成！开始检查响应结果...");

    if (err) {
        console.log("❌ [网络异常] IP 数据源获取失败，错误详情: " + JSON.stringify(err));
        $notification.post("CF 优选生成器", "获取优选 IP 失败", `网络请求错误: ${err}`);
        $done();
        return;
    }

    if (!response) {
        console.log("❌ [响应异常] 服务器未返回任何 Response 对象！");
        $done();
        return;
    }

    console.log(`   ├─ HTTP 状态码: ${response.status}`);
    console.log(`   └─ 数据字节长度: ${data ? data.length : 0} 字符`);

    if (response.status === 200 && data) {
        let ipList = [];

        if (SOURCE_TYPE === 'random') {
            // ================= 模式 1：动态随机碰撞网段 =================
            console.log("🔨 [网段解析] 开始解析 CIDR 列表并随机生成 IP...");
            
            // 按逗号或换行拆分成数组
            let cidrList = data.replace(/[	"'\r\n]+/g, ',').replace(/,+/g, ',').split(',');
            cidrList = cidrList.map(c => c.trim()).filter(c => c && c.includes('/'));
            console.log(`   ├─ 成功解析到网段 (CIDR) 数量: ${cidrList.length} 个`);

            if (cidrList.length === 0) {
                console.log("⚠️ [网段解析] 未提取到任何有效网段，将使用默认兜底网段 104.16.0.0/13");
                cidrList = ['104.16.0.0/13'];
            }

            // 根据网段随机碰撞生成 IP 算法
            const generateRandomIPFromCIDR = (cidr) => {
                const [baseIP, prefixLength] = cidr.split('/'), prefix = parseInt(prefixLength), hostBits = 32 - prefix;
                const ipInt = baseIP.split('.').reduce((a, p, i) => a | (parseInt(p) << (24 - i * 8)), 0);
                const randomOffset = Math.floor(Math.random() * Math.pow(2, hostBits));
                const mask = (0xFFFFFFFF << hostBits) >>> 0, randomIP = (((ipInt & mask) >>> 0) + randomOffset) >>> 0;
                return [(randomIP >>> 24) & 0xFF, (randomIP >>> 16) & 0xFF, (randomIP >>> 8) & 0xFF, randomIP & 0xFF].join('.');
            };

            // 随机生成 10 个 IP
            for (let i = 0; i < 10; i++) {
                const randomCIDR = cidrList[Math.floor(Math.random() * cidrList.length)];
                const randomIP = generateRandomIPFromCIDR(randomCIDR);
                ipList.push(randomIP);
            }
            console.log(`   └─ 成功随机碰撞生成 IP 数量: ${ipList.length} 个`);

        } else {
            // ================= 模式 2：每日已测速优选列表 =================
            if (ISP === 'other') {
                console.log("🔨 [数据解析] 开始使用中国大陆优化版其他 IP 数据源...");
                let lines = data.split('\n');
                let pool = [];
                lines.forEach(line => {
                    line = line.trim();
                    if (!line || line.startsWith('#')) return;
                    
                    let parts = line.split('#');
                    let ipPort = parts[0].trim();
                    let country = parts[1] ? parts[1].trim().toUpperCase() : 'UNK';
                    
                    let ip = ipPort.split(':')[0].trim();
                    let ipv4Match = ip.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/);
                    if (ipv4Match) {
                        pool.push({ ip: ipv4Match[0], country: country });
                    }
                });

                const ASIA_REGIONS = ['HK', 'TW', 'JP', 'SG', 'KR'];
                let asianPool = pool.filter(item => ASIA_REGIONS.includes(item.country));
                let otherPool = pool.filter(item => !ASIA_REGIONS.includes(item.country));
                
                asianPool.sort(() => Math.random() - 0.5);
                otherPool.sort(() => Math.random() - 0.5);
                
                let sortedPool = [...asianPool, ...otherPool];
                if (sortedPool.length > 0) {
                    let selectedItems = sortedPool.slice(0, 10);
                    selectedItems.forEach(item => {
                        ipList.push(item.ip);
                    });
                    console.log(`   └─ 成功提取出低延迟优选 IP 数量: ${ipList.length} 个`);
                } else {
                    console.log("❌ [解析失败] 提取的 IP 列表为空！");
                }
            } else {
                console.log("🔨 [数据解析] 开始使用原有 vfarid 优选列表提取 IP...");
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
                console.log(`   └─ 成功提取出有效 IP 数量: ${ipList.length} 个`);
            }
        }

        if (ipList.length > 0) {
            // 保留前 10 个最优质的 IP
            let bestIPs = ipList.slice(0, 10);
            console.log(`🎯 [节点合成] 开始组装节点，数据源: ` + JSON.stringify(bestIPs));
            
            let nodeLinks = [];

            // 循环遍历优选 IP，直接生成对应的节点
            bestIPs.forEach((ip, index) => {
                const ispMark = ISP_NAME_MAP[ISP] || ISP.toUpperCase();
                let remarkStr = '';
                if (SOURCE_TYPE === 'random') {
                    remarkStr = `CF-${ispMark}-随机-${index + 1}`;
                } else {
                    // 列表模式：保持相同的命名结构，但名字叫“列表”而非“随机”
                    remarkStr = `CF-${ispMark}-列表-${index + 1}`;
                }
                let remark = encodeURIComponent(remarkStr);

                let nodeLink = '';
                if (PROTOCOL === 'vless') {
                    if (isTls) {
                        nodeLink = `vless://${UUID}@${ip}:${PORT}?security=tls&type=ws&host=${HOST}&sni=${HOST}&path=${encodeURIComponent(PATH)}#${remark}`;
                    } else {
                        nodeLink = `vless://${UUID}@${ip}:${PORT}?security=none&type=ws&host=${HOST}&path=${encodeURIComponent(PATH)}#${remark}`;
                    }
                } else if (PROTOCOL === 'trojan') {
                    if (isTls) {
                        nodeLink = `trojan://${UUID}@${ip}:${PORT}?security=tls&type=ws&host=${HOST}&sni=${HOST}&path=${encodeURIComponent(PATH)}#${remark}`;
                    } else {
                        nodeLink = `trojan://${UUID}@${ip}:${PORT}?security=none&type=ws&host=${HOST}&path=${encodeURIComponent(PATH)}#${remark}`;
                    }
                }

                if (nodeLink) {
                    console.log(`   ├─ 成功组装节点 [${index + 1}]: ${PROTOCOL}://******@${ip}:${PORT}`);
                    nodeLinks.push(nodeLink);
                }
            });

            // 将所有生成的节点拼接成文本
            const resultNodes = nodeLinks.join('\n');
            
            // 进行 Base64 编码
            const base64Nodes = btoa(resultNodes);
            
            console.log("💾 [缓存写入] 尝试将 Base64 数据写入 Loon 本地持久化缓存 `CF_BEST_NODES`...");
            // 保存至本地全局持久化存储中
            const saveSuccess = $persistentStore.write(base64Nodes, "CF_BEST_NODES");
            
            if (saveSuccess) {
                console.log("✅ [缓存写入] 写入本地持久化缓存成功！");
                $notification.post("CF 优选生成器", "节点生成成功", `已成功生成 ${nodeLinks.length} 个最优质的优选节点，Loader 节点已同步更新！`);
            } else {
                console.log("❌ [缓存写入] 严重错误：写入本地持久化缓存失败！请检查 Loon 存储权限。");
                $notification.post("CF 优选生成器", "缓存写入失败", "写入本地存储失败，请重试！");
            }
            
            console.log("=== [CF 优选生成器] 脚本执行成功完毕 ===");
            $done();
        } else {
            console.log("❌ [解析数据] 提取的 IP 列表为空！无法生成任何节点。");
            $notification.post("CF 优选生成器", "生成 0 个节点", "解析出的有效 IP 列表为空，请检查数据源！");
            $done();
        }
    } else {
        console.log(`❌ [响应异常] 请求失败！HTTP 状态码异常，或数据内容为空。`);
        $notification.post("CF 优选生成器", "生成 0 个节点", `服务器响应异常，状态码: ${response.status}`);
        $done();
    }
});
