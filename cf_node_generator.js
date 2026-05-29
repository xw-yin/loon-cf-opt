/**
 * Loon 脚本订阅：自动拉取优选 IP 并直接生成代理节点 (高维调试日志版)
 */

console.log("=== [CF 优选生成器] 脚本启动 ===");

// ================= 解析 Loon 插件面板传入的配置参数 =================
function getArguments() {
    let args = {
        UUID: '90cd4a77-141a-43c9-991b-08263cfe9c10', // 默认测试 UUID
        HOST: 'your-worker-domain.com',               // 默认测试域名
        PATH: '/video',                               // 默认测试路径
        PORT: '443',                                  // 默认测试端口
        PROTOCOL: 'vless'                             // 默认测试协议
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

console.log(`🔍 [配置解析] 最终参数结果:`);
console.log(`   ├─ 协议: ${PROTOCOL}`);
console.log(`   ├─ 域名: ${HOST}`);
console.log(`   ├─ 路径: ${PATH}`);
console.log(`   ├─ 端口: ${PORT}`);
console.log(`   └─ 凭据: ${UUID.substring(0, 8)}****** (已进行脱敏处理)`);

// 优质的公开优选 IP 源 (使用 GitHub 镜像加速通道，确保直连可达)
const IP_SOURCE_URL = 'https://ghproxy.net/https://raw.githubusercontent.com/vfarid/cf-clean-ips/main/list.txt'; 

console.log(`📡 [网络请求] 开始通过直连 (DIRECT) 路由获取优选 IP 列表...`);
console.log(`   └─ 目标 URL: ${IP_SOURCE_URL}`);

$httpClient.get({
    url: IP_SOURCE_URL,
    policy: "DIRECT" // 强制走直连
}, function(err, response, data) {
    console.log("📡 [网络请求] 请求完成！开始检查响应结果...");

    if (err) {
        console.log("❌ [网络异常] 优选 IP 获取失败，错误详情: " + JSON.stringify(err));
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
        console.log("🔍 [内容校验] 成功拉取到原始数据！前 150 个字符为:");
        console.log(`   > "${data.substring(0, 150).replace(/\n/g, ' ')}..."`);

        // 按行解析 IP，使用正则提取合法 IP
        console.log("🔨 [解析数据] 开始使用正则表达式提取合法 IP 地址...");
        let lines = data.split('\n');
        console.log(`   ├─ 原始总行数: ${lines.length} 行`);

        let ipList = [];
        lines.forEach(line => {
            line = line.trim();
            if (!line || line.startsWith('#') || line.toLowerCase().includes('update') || line.toLowerCase().includes('ip')) return;
            
            // 正则匹配 IPv4
            let ipv4Match = line.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/);
            if (ipv4Match) {
                ipList.push(ipv4Match[0]);
                return;
            }
            
            // 正则匹配 IPv6 (如 2606:4700::)
            let ipv6Match = line.match(/\b(?:[a-fA-F0-9]{1,4}:){2,7}[a-fA-F0-9]{1,4}\b/);
            if (ipv6Match) {
                ipList.push(`[${ipv6Match[0]}]`);
                return;
            }
        });
        
        console.log(`   └─ 过滤并成功提取出有效 IP 数量: ${ipList.length} 个`);

        if (ipList.length > 0) {
            // 保留前 10 个最优质的 IP
            let bestIPs = ipList.slice(0, 10);
            console.log(`🎯 [节点合成] 选择最优质的前 ${bestIPs.length} 个 IP 进行组装: ` + JSON.stringify(bestIPs));
            
            let nodeLinks = [];

            // 循环遍历优选 IP，直接生成对应的节点
            bestIPs.forEach((ip, index) => {
                let nodeLink = '';
                let remark = encodeURIComponent(`CF优选-${index + 1}`);

                if (PROTOCOL === 'vless') {
                    nodeLink = `vless://${UUID}@${ip}:${PORT}?security=tls&type=ws&host=${HOST}&sni=${HOST}&path=${encodeURIComponent(PATH)}#${remark}`;
                } else if (PROTOCOL === 'trojan') {
                    nodeLink = `trojan://${UUID}@${ip}:${PORT}?security=tls&type=ws&host=${HOST}&sni=${HOST}&path=${encodeURIComponent(PATH)}#${remark}`;
                }

                if (nodeLink) {
                    // 脱敏打印生成的节点信息，方便调试
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
            console.log("❌ [解析数据] 过滤后的 IP 列表为空！无法生成任何节点。");
            $notification.post("CF 优选生成器", "生成 0 个节点", "解析出的有效 IP 列表为空，请检查 IP 源格式！");
            $done();
        }
    } else {
        console.log(`❌ [响应异常] 请求失败！HTTP 状态码异常，或数据内容为空。`);
        $notification.post("CF 优选生成器", "生成 0 个节点", `服务器响应异常，状态码: ${response.status}`);
        $done();
    }
});
