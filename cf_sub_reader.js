/**
 * Loon 节点读取中转器 (HTTP 重写 Mock 版)
 * 
 * 作用：拦截对虚拟域名 https://speed.cloudflare.com/cf_sub 的请求，
 * 从全局持久化存储中读取已生成的优选节点，并以 HTTP 200 响应直接返回给 Loon。
 */

console.log("=== [CF 优选 Loader] 收到虚拟订阅中转请求 ===");

const cachedNodes = $persistentStore.read("CF_BEST_NODES");

if (cachedNodes) {
    console.log("✅ [CF 优选 Loader] 成功从全局持久化缓存读取节点数据，开始返回 Mock 响应...");
    
    $done({
        response: {
            status: 200,
            headers: {
                "Content-Type": "text/plain; charset=utf-8",
                "Subscription-Userinfo": "upload=0; download=0; total=1099511627776; expire=4102329600" // 模拟订阅信息，到期时间 2099 年
            },
            body: cachedNodes
        }
    });
} else {
    console.log("⚠️ [CF 优选 Loader] 缓存为空！返回引导性占位节点，以确保订阅可以顺利添加成功...");
    
    // 组装一个特殊的 VLESS 节点链接，用于提醒用户手动执行脚本
    const placeholderLink = "vless://00000000-0000-4000-8000-000000000000@127.0.0.1:443?security=tls&type=ws&host=example.com&path=%2F#%E8%AF%B7%E5%85%88%E5%9C%A8%E6%8F%92%E4%BB%B6%E4%B8%AD%E6%89%8B%E5%8A%A8%E6%89%A7%E8%A1%8C%E4%B8%80%E6%AC%A1%E4%BC%98%E9%80%89%E8%84%9A%E6%9C%AC";
    
    // 进行 Base64 编码
    const base64Placeholder = btoa(placeholderLink);
    
    $done({
        response: {
            status: 200,
            headers: {
                "Content-Type": "text/plain; charset=utf-8"
            },
            body: base64Placeholder
        }
    });
}
