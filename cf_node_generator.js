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
        PORT: '443',                  ...