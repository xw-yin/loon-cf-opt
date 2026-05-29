/**
 * 定时获取并缓存 Cloudflare 优选 IP
 * Cron: 0 0 */12 * * * (每12小时运行一次)
 */

// 优质的公开优选 IP 源（每日自动更新，使用 GitHub 镜像加速通道确保直连可达）
const IP_SOURCE_URL = 'https://ghproxy.net/https://raw.githubusercontent.com/vfarid/cf-clean-ips/main/list.txt'; 

$httpClient.get({
    url: IP_SOURCE_URL,
    policy: "DIRECT" // 强制 Loon 走直连 (DIRECT) 路由，确保获取最契合你本地真实网络的 IP
}, function(err, response, data) {
    if (err) {
        console.log("❌ 优选 IP 获取失败: " + err);
        $notification.post("CF 优选助手", "获取优选 IP 失败", err);
        $done();
        return;
    }

    if (response.status === 200 && data) {
        // 按行解析 IP，并提取出合法 IP
        let lines = data.split('\n');
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

        if (ipList.length > 0) {
            // 仅保留前 10 个最优质的 IP
            let bestIPs = ipList.slice(0, 10);
            
            // 写入本地持久化存储
            const success = $persistentStore.write(JSON.stringify(bestIPs), "CF_BEST_IPS");
            
            if (success) {
                console.log("✅ 优选 IP 已成功存入缓存: " + JSON.stringify(bestIPs));
                $notification.post("CF 优选助手", "IP 缓存更新成功", `已缓存 ${bestIPs.length} 个最新优选 IP！`);
            } else {
                console.log("❌ 本地缓存写入失败");
            }
        }
    } else {
        console.log("❌ 服务器返回状态码异常: " + response.status);
    }
    $done();
});
