/**
 * 定时获取并缓存 Cloudflare 优选 IP
 * Cron: 0 0 */12 * * * (每12小时运行一次)
 */

// 优质的公开优选 IP 源（每日自动更新）
const IP_SOURCE_URL = 'https://raw.githubusercontent.com/vfarid/cf-clean-ips/main/list.txt'; 

$httpClient.get(IP_SOURCE_URL, function(err, response, data) {
    if (err) {
        console.log("❌ 优选 IP 获取失败: " + err);
        $notification.post("CF 优选助手", "获取优选 IP 失败", err);
        $done();
        return;
    }

    if (response.status === 200 && data) {
        // 按行解析 IP，过滤掉空行和注释
        let ipList = data.split('\n')
            .map(line => line.trim())
            .filter(line => line && !line.startsWith('#'));

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
