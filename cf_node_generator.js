/**
 * Loon 脚本订阅：自动拉取优选 IP 并直接生成代理节点
 * 
 * 使用方法：
 * 在 Loon 的 [Proxy] 节点配置中添加：
 * CF优选订阅 = script, script-path=cf_node_generator.js, interval=43200
 */

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
        let pairs = $argument.split('&');
        for (let pair of pairs) {
            let [key, val] = pair.split('=');
            if (key && val) {
                args[key] = decodeURIComponent(val);
            }
        }
    }
    return args;
}

const config = getArguments();
const UUID = config.UUID;
const HOST = config.HOST;
const PATH = config.PATH;
const PORT = Number(config.PORT || 443);
const PROTOCOL = config.PROTOCOL.toLowerCase();
// =======================================================================

// 优质的公开优选 IP 源 (使用 GitHub 镜像加速通道，确保直连可达)
const IP_SOURCE_URL = 'https://ghproxy.net/https://raw.githubusercontent.com/vfarid/cf-clean-ips/main/list.txt'; 

$httpClient.get({
    url: IP_SOURCE_URL,
    policy: "DIRECT" // 强制 Loon 走直连 (DIRECT) 路由，确保获取最契合你本地真实网络的 IP
}, function(err, response, data) {
    if (err) {
        console.log("❌ 优选 IP 获取失败: " + err);
        $notification.post("CF 优选生成器", "获取优选 IP 失败", err);
        $done(""); // 失败时返回空，不破坏原有节点
        return;
    }

    if (response.status === 200 && data) {
        // 按行解析 IP，过滤空行和注释
        let ipList = data.split('\n')
            .map(line => line.trim())
            .filter(line => line && !line.startsWith('#'));

        if (ipList.length > 0) {
            // 保留前 10 个最优质的 IP
            let bestIPs = ipList.slice(0, 10);
            let nodeLinks = [];

            // 循环遍历优选 IP，直接生成对应的节点
            bestIPs.forEach((ip, index) => {
                let nodeLink = '';
                let remark = encodeURIComponent(`CF优选-${index + 1}`);

                if (PROTOCOL === 'vless') {
                    // 生成标准 VLESS 节点链接
                    nodeLink = `vless://${UUID}@${ip}:${PORT}?security=tls&type=ws&host=${HOST}&sni=${HOST}&path=${encodeURIComponent(PATH)}#${remark}`;
                } else if (PROTOCOL === 'trojan') {
                    // 生成标准 Trojan 节点链接
                    nodeLink = `trojan://${UUID}@${ip}:${PORT}?security=tls&type=ws&host=${HOST}&sni=${HOST}&path=${encodeURIComponent(PATH)}#${remark}`;
                }

                if (nodeLink) {
                    nodeLinks.push(nodeLink);
                }
            });

            // 将所有生成的节点拼接成文本
            const resultNodes = nodeLinks.join('\n');
            
            // 进行 Base64 编码
            const base64Nodes = btoa(resultNodes);
            
            // 保存至本地全局持久化存储中
            $persistentStore.write(base64Nodes, "CF_BEST_NODES");
            
            console.log(`✅ 成功生成 ${nodeLinks.length} 个优选节点并写入缓存！`);
            $notification.post("CF 优选生成器", "节点生成成功", `已成功生成 ${nodeLinks.length} 个最优质的优选节点，Loader 节点已同步更新！`);
            
            $done(); // 定时任务脚本执行完毕
        } else {
            console.log("❌ 解析出的 IP 列表为空");
            $done();
        }
    } else {
        console.log("❌ 请求状态码异常: " + response.status);
        $done();
    }
});
