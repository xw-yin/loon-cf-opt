/**
 * Loon 节点读取器：从本地持久化缓存中读取优选生成器写入的节点
 */

const cachedNodes = $persistentStore.read("CF_BEST_NODES");

if (cachedNodes) {
    console.log("✅ 成功从本地缓存读取优选节点列表");
    $done(cachedNodes);
} else {
    console.log("❌ 本地优选节点缓存为空，请先在插件中手动执行一次“CF优选IP定时抓取”生成节点！");
    $done("");
}
