# ⚡️ Loon Cloudflare 优选 IP 自动生成器 (面板配置版)

这是一个专为 iOS 网络代理工具 **Loon** 设计的极简优选 IP 自动生成器。它利用了 Loon 插件的可视化参数配置、本地持久化数据库和 **HTTP 响应劫持重写（Mock）**，实现了**全自动、全本地化、免修改代码的零维护体验**！

---

## 📂 文件目录说明

- **`cf_opt.plugin`**：Loon 插件配置文件。提供手机端的**可视化配置面板**，并注册一个每 12 小时（或手动）定时运行的生成脚本。同时会在本地声明并劫持虚拟域名 `cf-best-nodes.com` 的解密。
- **`cf_node_generator.js`**：节点生成器脚本。直连拉取最快的 IP，根据面板填写的凭据组装成 VLESS/Trojan 链接，并写入全局数据库 `CF_BEST_NODES` 中。
- **`cf_sub_reader.js`**：【核心升级】节点读取中转器。通过 HTTP 重写拦截虚拟域名 `https://cf-best-nodes.com/sub`，从全局缓存中读取生成好的优选节点直接返回给 Loon。

---

## 🚀 极简使用教程（一键生成，3分钟起飞）

### 第一步：推送最新代码到你的 GitHub 远程仓库
在电脑终端（Terminal）运行以下命令，把本地的完整优化版代码推送到你的 GitHub：
```bash
cd /Users/yinxinwang/.gemini/antigravity/scratch/loon-cf-opt
git add .
git commit -m "Architectural upgrade: HTTP Mock redirect loader for persistent store"
git push -u origin main
```

---

### 第二步：在 Loon 中导入插件并配置

1. 复制你 GitHub 上 `cf_opt.plugin` 的 **Raw 原始链接**（记得将 `xw-yin` 替换为你的 GitHub 用户名）：
   ```url
   https://raw.githubusercontent.com/xw-yin/loon-cf-opt/main/cf_opt.plugin
   ```
2. 打开手机上的 **Loon** -> 进入 **“配置”** -> 点击 **“插件”**。
3. 点击右上角 `+`，选择 **“从链接安装”**，粘贴上面的链接并启用。
4. **一键填表**：在插件列表中点击刚刚导入的 `⚡️ Cloudflare 优选 IP 自动生成器`。
   * 直接在手机屏幕上填入你的 UUID、域名、路径，并选择端口与协议。
   * 点击右上角 **“保存”**。

---

### 第三步：在 Loon 中添加普通节点订阅 (关键)

因为我们使用了 HTTP 劫持拦截，你只需要添加一个**普通订阅**，完全不需要添加复杂的脚本订阅：

1. 打开 **Loon** -> 找到 **“配置”** -> 点击 **“订阅（Subscriptions）”**。
2. 点击右上角 `+`，选择 **“从链接安装”**。
3. 在链接输入框中直接填入**虚拟订阅链接**（名称自定义为 `CF优选节点`）：
   ```url
   https://cf-best-nodes.com/sub
   ```
   *(别担心，这是一个虚拟链接，它不会真的连到互联网，而是会被我们的插件在手机本地直接拦截并返回缓存数据！)*
4. 点击保存。

---

### 第四步：首次运行与效果验证
1. 打开 **Loon** -> 进入 **“配置”** -> 点击 **“脚本”**。
2. 找到定时任务 `CF优选IP定时抓取`，点击右侧的 **“手动执行”**。
3. 手机会立刻收到系统通知横幅：
   > **🔔 CF 优选生成器**
   > **已成功生成 10 个最优质的优选节点，Loader 节点已同步更新！**
4. 此时回到 **“订阅”** 列表，手动更新一次你刚刚添加的 `CF优选节点`（即 `https://cf-best-nodes.com/sub`）订阅。
5. 去你的节点列表里看，10 个闪电般快速的优选节点已经完美呈现在里面！

---

## ⚠️ 免责声明
1. 本项目仅供网络学术研究和技术交流使用。
2. 使用本插件时，请遵守当地的网络法律法规。
