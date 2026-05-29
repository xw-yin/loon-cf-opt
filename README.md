# ⚡️ Loon Cloudflare 优选 IP 自动生成器 (面板配置版)

这是一个专为 iOS 网络代理工具 **Loon** 设计的极简优选 IP 自动生成器。它利用了 Loon 插件的可视化参数配置和 **HTTP 响应劫持重写（Mock）**，实现了**全自动、全本地化、免修改代码的零维护体验**！

---

## 📂 文件目录说明

- **`cf_opt.plugin`**：Loon 插件配置文件。提供手机端的**可视化配置面板**，并注册一个重写劫持规则，同时会在本地声明并劫持 `httpbin.org` 的解密。
- **`cf_sub_reader.js`**：【终极形态】实时节点生成中转器。拦截域名路径 `http://httpbin.org/cf_sub` 后，**直接在本地实时拉取优选 IP / 随机碰撞网段，生成 10 个最快节点直接返回给 Loon**。免除了一切 Cron 定时任务、本地缓存以及进程数据不互通的烦恼！

---

## 🚀 极简使用教程（一键生成，2分钟起飞）

本方案已将所有逻辑合并入单个本地 HTTP 劫持脚本，实现了极简的“即更新即生成”体验！

### 第一步：推送最新代码到你的 GitHub 远程仓库
在电脑终端（Terminal）运行以下命令，把本地的完整优化版代码推送到你的 GitHub：
```bash
cd /Users/yinxinwang/.gemini/antigravity/scratch/loon-cf-opt
git add .
git commit -m "Expose combined loader script to achieve pure reactive zero-cache generation"
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
3. 在链接输入框中填入**高可用的虚拟订阅链接**（名称自定义为 `CF优选节点`）：
   ```url
   http://httpbin.org/cf_sub
   ```
   *(注：使用 http:// 开头。httpbin.org 是标准的全球解析测试站，永远不会被国内分流规则匹配为 DIRECT 直连，因此 100% 能够被我们的重写引擎在本地拦截！)*
4. 点击保存。
5. 手动点击更新你的 `CF优选节点` 订阅。

**大功告成！🎉 10 个闪电般快速的优选节点已经完美呈现在你的节点列表中，全部数据都在本地实时计算，没有任何延迟和缓存同步的麻烦！**

---

## ⚠️ 免责声明
1. 本项目仅供网络学术研究和技术交流使用。
2. 使用本插件时，请遵守当地的网络法律法规。
