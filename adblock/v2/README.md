# Loon 广告拦截修复版 v2（远程脚本）

[导入插件](https://raw.githubusercontent.com/xw-yin/loon-cf-opt/main/adblock/v2/blockAdsV2.fixed.v2.remote.plugin) · [当前目录](https://github.com/xw-yin/loon-cf-opt/tree/main/adblock/v2)

这是本地修复 v2 的远程发布版本。去广告规则及 JS 行为保持一致，仅将两份本地脚本引用替换为固定 Git 提交的 HTTPS 地址。无需复制 JS 到 Loon 本地脚本目录。

## 使用

1. 在 Loon 的插件管理中添加上方导入链接，停用之前的本地版及会重复处理同一接口的其他插件。
2. 使用 Loon 3.5.1（983）或更新版本，并保持对应 MITM 和证书信任设置。远程部署不替代 HTTPS 解密。
3. 确保 Loon 能下载插件及其脚本；更新或重载插件后，彻底关闭目标 App 再打开。旧开屏素材可能仍在 App 缓存中。

更新地址指向本仓库 main 分支；两份脚本固定在提交 `af05bd159217d07f50a6bb69ea0d10d1e7dde253`。以后修改脚本时，需要同时发布新的插件引用。原有其他远程依赖保留原有固定提交。

## 两份修复脚本

- [Coolapk_Redirect.fixed.js](https://raw.githubusercontent.com/xw-yin/loon-cf-opt/af05bd159217d07f50a6bb69ea0d10d1e7dde253/adblock/v2/Coolapk_Redirect.fixed.js)：酷安外链重定向。
- [VideoPages.fixed.js](https://raw.githubusercontent.com/xw-yin/loon-cf-opt/af05bd159217d07f50a6bb69ea0d10d1e7dde253/adblock/v2/VideoPages.fixed.js)：爱奇艺、芒果和优酷页面处理，包含本次芒果播放页修复。

文件 SHA-256 及绑定次数见 [manifest.json](manifest.json)。两份 JS 与本地修复 v2 的文件字节完全一致；脚本中原有“本地脚本目录”的注释是本地版说明，远程版无需执行该步骤。

## 范围与验证

本地 v2 已检查配置结构、1736 个正则、49 个 JQ，完成 12 个 JS 行为用例、8 个原生行为检查及 22 个相关接口匹配检查。发布时另外核对远程版规则正文一致、脚本字节一致及真实下载内容。

尚未在用户 iOS 设备实测；不同 App 版本可能仍有残留。芒果页面精简会隐藏部分会员入口和相关推荐。原合集的其他功能范围保留。单个脚本开关不会同时关闭该 App 的所有 Rule/Rewrite。没有将可选或证书绑定域名统一加入解密。

本目录独立于仓库原有 Cloudflare 优选插件。

## 来源

- 原始插件：[ifflagged/Romeo blockAdsV2.plugin](https://github.com/ifflagged/Romeo/blob/d27c811fbabc7b16d5bce4937e7b6672d48f89f1/Modules/Loon/fmz200/blockAdsV2.plugin)，原作者 fmz200 等作者信息保留。
- 视频脚本基线：[fmz200_cnftp.js](https://github.com/ifflagged/Romeo/blob/d27c811fbabc7b16d5bce4937e7b6672d48f89f1/Modules/JavaScript/fmz200/blockAdsV2/fmz200_cnftp.js)，原作者注释保留。
- 开屏及播放页规则对照：[fkingikelee/fkikelee lpx](https://github.com/fkingikelee/fkikelee/tree/e9c1c92f73999b5e17541d5ebaaefe763f8550bb/lpx)，仅采用已核对的相关规则并修正。
