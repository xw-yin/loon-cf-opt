/**
 * 订阅拦截与优选 IP 替换脚本
 * 类型: http-response
 */

let body = $response.body;

if (!body) {
    console.log("❌ 订阅内容为空，跳过处理");
    $done({});
}

// 1. 从本地缓存读取定时脚本存入的优选 IP
let cachedIPsRaw = $persistentStore.read("CF_BEST_IPS");
let cfIPs = [];

if (cachedIPsRaw) {
    try {
        cfIPs = JSON.parse(cachedIPsRaw);
    } catch (e) {
        console.log("❌ 缓存解析失败: " + e);
    }
}

// 如果缓存为空，则提供默认的兜底 IP
if (!cfIPs || cfIPs.length === 0) {
    cfIPs = ["104.16.80.1", "104.17.80.2", "104.18.80.3"];
}

try {
    // 2. Base64 解码订阅内容
    let rawSub = atob(body.replace(/[^A-Za-z0-9+/=]/g, ""));
    let lines = rawSub.split('\n');
    let modifiedLines = [];
    let ipIndex = 0;

    // 3. 逐行分析并修改节点
    for (let line of lines) {
        line = line.trim();
        if (!line) continue;

        // 支持 VLESS 和 Trojan 协议节点的匹配
        if (line.startsWith("vless://") || line.startsWith("trojan://")) {
            // 解析出：协议://密码@原地址:端口?参数#备注
            let match = line.match(/^([a-z]+:\/\/)([^@]+)@([^:]+):(\d+)(.*)$/);
            
            if (match) {
                let protocol = match[1]; // vless:// 或 trojan://
                let auth = match[2];     // uuid 或 密码
                let oldAddress = match[3]; // 原本的节点服务器域名/IP
                let port = match[4];     // 端口
                let params = match[5];   // 携带的配置参数

                // 核心控制：将服务器连接地址替换为最新的优选 IP
                // 使用轮询算法，使得每个节点分到不同的优选 IP
                let targetIP = cfIPs[ipIndex % cfIPs.length];
                ipIndex++;

                // 如果原参数里没有设置 host/sni，需要把原本的域名追加进参数里，以防 TLS 握手失败
                if (!params.includes("host=") && oldAddress.includes(".")) {
                    params += `&host=${oldAddress}&sni=${oldAddress}`;
                }

                // 重新组装节点
                let newLink = `${protocol}${auth}@${targetIP}:${port}${params}`;
                modifiedLines.push(newLink);
            } else {
                modifiedLines.push(line);
            }
        } else {
            modifiedLines.push(line);
        }
    }

    // 4. 将修改后的节点重新进行 Base64 编码并传回 Loon
    let newBody = btoa(modifiedLines.join('\n'));
    $done({ body: newBody });

} catch (err) {
    console.log("❌ 订阅解析重写出错: " + err);
    $done({});
}
