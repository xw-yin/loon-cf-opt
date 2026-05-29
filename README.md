# ⚡️ Loon Cloudflare 优选 IP 自动注入/生成插件

这是一个专为 iOS 网络代理工具 **Loon** 设计的高级优选 IP 自动处理系统。它包含两种实现方案，满足不同用户的需求：

1. **🔥 极简方案（强烈推荐）**：使用“脚本订阅”功能，直接抓取最优 IP 并使用你配置的 Worker 凭证生成 10 个优选代理节点。**无需配置 MitM 证书，无需解密 HTTPS，无复杂正则匹配，一键即用。**
2. **💪 进阶方案**：使用“订阅重写拦截”功能，自动拦截并解析你现有的机场订阅，将里面的节点 IP 动态替换为最新优选 IP。

---

## 📂 文件目录说明

- **`cf_node_generator.js`**：【极简方案核心】自动抓取最新的优选 IP，动态组装出 10 个标准的 VLESS / Trojan 优选节点，并以 Base64 编码格式返回给 Loon。
- **`cf_cron.js`**：【进阶方案】定时任务脚本，负责获取最优质的 CF 优选 IP 并写入 Loon 本地持久化缓存。
- **`cf_sub.js`**：【进阶方案】重写脚本，拦截并替换你现有订阅中的节点 IP。
- **`cf_opt.plugin`**：【进阶方案】Loon 插件配置文件。

---

## 🚀 极简方案使用教程（最推荐，3分钟搞定）

此方案使用 `cf_node_generator.js` 脚本。你只需要将该脚本下载到本地并修改 4 个参数，然后在 Loon 中添加为“脚本订阅”即可！

### 第一步：修改你的凭证参数
1. 用文本编辑器打开本地的 `cf_node_generator.js` 文件。
2. 修改第 **10~15 行** 的配置参数为**你自己的 Cloudflare Worker/Pages 节点信息**：
   ```javascript
   const UUID = '你的UUID';             // 你的 VLESS UUID 或 Trojan 密码
   const HOST = 'your-domain.com';     // 你的 Worker 绑定域名
   const PATH = '/video';              // 你的连接路径 (默认为 /video 或 /)
   const PORT = 443;                   // 端口 (一般是 443)
   const PROTOCOL = 'vless';           // 协议类型，支持 'vless' 或 'trojan'
   ```
3. 保存修改并将最新代码推送提交至 GitHub 仓库。

### 第二步：在 Loon 中添加脚本订阅
1. 复制你在 GitHub 上修改后的 `cf_node_generator.js` 文件的 **Raw 原始链接**：
   ```url
   https://raw.githubusercontent.com/xw-yin/loon-cf-opt/main/cf_node_generator.js
   ```
2. 打开 **Loon** -> 进入 **“配置”** -> 点击 **“订阅”**。
3. 点击右上角的 **`+` 号**，选择 **“从链接安装”**。
4. 粘贴你复制的 `cf_node_generator.js` 链接，点击确定并保存。
5. **搞定！** 你的 Loon 节点列表中会立刻多出 10 个冠名 `CF优选-1` ~ `CF优选-10` 的节点，延迟和速度都是当前你所在网络环境中最优的！

---

## 🛠 进阶方案使用教程（支持修改现有机场订阅）

此方案适用于希望把优选 IP 动态注入到现有第三方订阅中的用户。由于涉及解密 HTTPS 流量，步骤稍繁琐：

### 第一步：配置 Loon 的 HTTPS 解密 (MitM)
1. 打开 Loon 客户端，进入 **“配置” -> “证书管理”**。
2. 生成 CA 证书并安装。然后前往 iOS **“设置” -> “通用” -> “关于本机” -> “证书信任设置”** 中，对 Loon 证书开启**始终信任**。

### 第二步：安装插件
1. 打开 Loon，进入 **“配置” -> “插件”**，点击右上角 `+`，选择 **“从链接安装”**。
2. 填入你 GitHub 仓库上生成的 `.plugin` 文件的 `Raw` 链接：
   ```url
   https://raw.githubusercontent.com/xw-yin/loon-cf-opt/main/cf_opt.plugin
   ```
3. 启用该插件。

### 第三步：修改订阅匹配规则
1. 在 Loon 的插件列表中，编辑刚刚导入的插件。
2. 将 `http-response` 对应的正则匹配表达式 `your-sub-link\.com\/sub` 修改为你**真实的节点订阅链接**。
3. 将 `[MITM]` 块下的 `hostname` 修改为你**真实的订阅解析域名**，保存。

### 第四步：运行并更新
1. 在 Loon 的 **“配置” -> “脚本”** 中找到 **“CF优选IP定时抓取”** 脚本，点击 **“手动执行”**。
2. 弹出 `IP 缓存更新成功` 后，更新你的节点订阅即可。

---

## ⚠️ 免责声明
1. 本项目仅供网络学术研究和技术交流使用。
2. 使用本插件时，请遵守当地的网络法律法规。
