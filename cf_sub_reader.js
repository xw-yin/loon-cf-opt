/**
 * Loon 节点读取中转器 (HTTP 重写 Mock 版)
 * 
 * 作用：拦截对虚拟域名 https://cf-best-nodes.com/sub 的请求，
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
    console.log("❌ [CF 优选 Loader] 严重错误：全局持久化缓存中未找到优选节点数据！");
    
    $done({
        response: {
            status: 500,
            headers: {
                "Content-Type": "text/plain; charset=utf-8"
            },
            body: "本地优选节点缓存为空，请先在 Loon 插件配置 -> 脚本 中，手动执行一次“CF优选IP定时抓取”生成节点！"
        }
    });
}
