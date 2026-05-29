/**
 * Loon 脚本订阅：自动拉取优选 IP 并直接生成代理节点
 * 
 * 使用方法：
 * 在 Loon 的 [Proxy] 节点配置中添加：
 * CF优选订阅 = script, script-path=cf_node_generator.js, interval=43200
 */

// ================= ⚠️ 填入你自己的 Cloudflare Worker 配置 =================
const UUID = '90cd4a77-141a-43c9-991b-08263cfe9c10'; // 你的 UUID 或 密码
const HOST = 'your-worker-domain.com';               // 你的 Worker 自定义域名
const PATH = '/video';                             // 你的 传输路径 (如 /video 或 /)
const PORT = 443;                                  // 端口 (一般是 443)
const PROTOCOL = 'vless';                          // 协议类型，支持 'vless' 或 'trojan'
// =======================================================================

// 优质的公开优选 IP 源
const IP_SOURCE_URL = 'https://raw.githubusercontent.com/vfarid/cf-clean-ips/main/list.txt'; 

$httpClient.get(IP_SOURCE_URL, function(err, response, data) {
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

            // 将所有生成的节点拼接成文本返回给 Loon
            const resultNodes = nodeLinks.join('\n');
            
            // 进行 Base64 编码，因为 Loon 脚本节点订阅支持返回 Base64 编码的节点列表
            const base64Nodes = btoa(resultNodes);
            
            console.log(`✅ 成功生成 ${nodeLinks.length} 个优选节点！`);
            $notification.post("CF 优选生成器", "节点生成成功", `已成功生成 ${nodeLinks.length} 个最优质的优选节点！`);
            
            $done(base64Nodes);
        } else {
            console.log("❌ 解析出的 IP 列表为空");
            $done("");
        }
    } else {
        console.log("❌ 请求状态码异常: " + response.status);
        $done("");
    }
});
