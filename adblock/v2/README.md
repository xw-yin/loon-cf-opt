# Loon 广告拦截修复版 v2.3（远程脚本）

[导入或更新插件](https://raw.githubusercontent.com/xw-yin/loon-cf-opt/main/adblock/v2/blockAdsV2.fixed.v2.remote.plugin) · [当前目录](https://github.com/xw-yin/loon-cf-opt/tree/main/adblock/v2)

本目录基于本地修复 v2，更新了 B 站空降助手兼容方案。导入地址保持不变，酷安及视频页面的两份修复 JS 继续远程加载，无需导入本地脚本。

## v2.3 变更（在 v2.2 基础上合并 ddgksf2013 可读规则）

v2.2 的 Kelee 方案实测仍不完整，本版按各家近期模块再对照补强；导入地址不变。

- **知乎**：保留 Kelee（配置剥离 HTTPDNS/QUIC + jq 过滤），补入 ddgksf2013 的 14 条纯 reject 规则（品牌提问卡、关注页角标、消息角标、个人主页卡片、电商/AB 配置、回访红点、HTTPDNS 的 /v2/resolv 广告解析等）。ddgksf2013 的知乎脚本为加密混淆代码、无法审计，本合集不打包；需要其脚本效果可单独安装 ddgksf2013 的知乎插件（与本合集的知乎段二选一）。
- **什么值得买**：保留 Kelee，补 ddgksf2013 脚本处理的四个 Kelee 未覆盖接口——zdmimg 的 CPM 广告分发（advert_distribution）、百科 home_v3、值友 vip 横幅、好价详情相关模块；脚本为可读源码，已自托管固定在本仓库（提交 `bf9cc7f`）。MITM 补 `baike-api.smzdm.com`、`zhiyou.m.smzdm.com`、`*.zdmimg.com`。
- **百度网盘**：保留 v2.2 合并集，补 ddgksf2013/sooyaaabo 的 6 条 reject（会员引导弹窗、热搜列表、短剧推荐、金币乐园通知、搜索填词、掌娱 zysdk）。首页信息流 feed/cardinfos 依赖 ddgksf2013 的混淆脚本，未打包，该处广告可能仍有残留。
- **大众点评**：移除最后一条 zirawell 图片脚本绑定，点评段改为纯 reject 规则（其余段落经审计无交叉干扰）；对应的脚本开关一并移除。
- 上一版 v2.2 快照为提交 `0c4c828`，可回退。

## v2.2 变更（知乎 / 什么值得买 / 百度网盘 / 大众点评）

针对 v2.1 实测中四个 App 的问题修复；导入地址不变，其他 App 规则与 B 站方案不变。

- **知乎、什么值得买**：原 fmz200 的 Rewrite/Script 段整体换成 Kelee 的同名专版方案（来源 ifflagged/Romeo 的 Kelee 模块，2026-10-02 版，jq 响应过滤）。知乎补上 MITM 缺失的 `page-info.zhihu.com`、`zhida.zhihu.com`，并剥离 HTTPDNS/QUIC 配置、`commercial_api` 整段拦截；什么值得买补 `adx-api.zdmimg.com` 域名拒绝，首页 jq 文件固定在 Romeo 提交 `af682d97`，不随 main 漂移。原 `vihu_enable`、`smzdm_enable` 两个脚本开关随旧脚本段一并移除。
- **百度网盘**：以 Kelee 方案为主（reject 开屏配置 `getconfig`/`getsyscfg`、新广告接口 `pcs/adv`，并对 `feed/kingkongdistrict` 做 jq 过滤），合并 fmz200 不重叠的旧规则（开屏素材、活动 JS 等）；两边同路径的 `activityentry` 只保留 Kelee 版。
- **大众点评**：移除三条会误伤正常页面的 reject——ddplus 框架包（ehc/titansx/ddblue/edfu）、dpfile 的 picasso AnswerList 包、awp-assets 的 fep 页面配置 JSON；并移除 ddplus picassovc 的响应脚本绑定（zirawell 脚本注明仅适用于点评 11.28.3 及以下）。开屏与图片广告拦截保留。
- **最低 Loon 版本升至 3.5.1（998）**：Kelee 方案依赖 `response.json.jq`，旧版本请先升级 Loon。

上一版 v2.1 快照为提交 `7472091`，可从该提交取回旧插件文件回退。

## B 站空降助手变化

- [上游说明](https://github.com/kokoryh/Sparkle/blob/caf42c487706787431109cc105e93fcec8fc61cd/src/script/bilibili/README.md)指出：B 站 9.17.0 起启用强制 RSA 验签。9.17+ 改为在进度条标记广告章节，需要手动点击章节跳过，不能恢复旧式自动空降。
- 上一版合集的弹幕请求脚本遇到 9.17+ 会直接停用，且未绑定新方案所需的 ViewProgress 请求。本次更新请求和响应两份 protobuf 脚本，增加手机及 iPad 的 ViewProgress 请求绑定。
- 低于该版本的客户端保留上游原有弹幕空降方案。数据库没有标记的视频不会凭空产生广告章节；当前上游仅采用 sponsor 分类、skip 动作且时长至少 8 秒的片段。
- 两份 B 站脚本固定在提交 `caf42c487706787431109cc105e93fcec8fc61cd`，没有使用随 master 漂移的引用。酷安与爱奇艺/芒果/优酷脚本继续固定在原发布提交；其他 App 规则不变。

## 使用

1. 使用 Loon **3.5.1（998）或更新版本**。在插件管理中更新已安装的本合集，或添加上方导入链接。若 Loon 保留旧脚本缓存，需要刷新脚本或重新载入插件。
2. 打开本合集的“bilibili-空降助手”开关，保留对应 MITM 和证书信任设置。
3. 彻底关闭并重新打开 B 站。9.17+ 请展开播放器进度条/章节，寻找“广告”标记并点击章节跳转。
4. 本合集与独立“哔哩哔哩增强”插件只保留一套处理相同接口，避免重复改写。保持 `bsbsb.top` 的代理路由可用；数据库请求失败或没有标记时不会添加章节。

远程部署不替代 HTTPS 解密。旧客户端的 Chronos 资源仍按上游方式下载；未改写为本仓库镜像。

## 验证与边界

已对实际固定版本的 JS 执行 12 项离线行为检查：9.17+ 手动章节、原 RSA 元数据保留、iPad 分支、9.16 弹幕与 Chronos、数据库空结果/404/超时/短片段、响应再次处理及 AIRelateAsync 广告字段清理。另检查配置、URL 匹配、MITM 和发布文件下载哈希。尚未在用户 iOS 设备实测，不能保证所有客户端及视频均有效。

原 v2 的开屏/播放页修复、会员入口精简及其他功能范围保留。单个脚本开关不会同时停用该 App 的全部 Rule/Rewrite。本目录独立于仓库原有 Cloudflare 优选插件。

## 文件与来源

- [Coolapk_Redirect.fixed.js](https://raw.githubusercontent.com/xw-yin/loon-cf-opt/af05bd159217d07f50a6bb69ea0d10d1e7dde253/adblock/v2/Coolapk_Redirect.fixed.js)：酷安外链。
- [VideoPages.fixed.js](https://raw.githubusercontent.com/xw-yin/loon-cf-opt/af05bd159217d07f50a6bb69ea0d10d1e7dde253/adblock/v2/VideoPages.fixed.js)：爱奇艺、芒果及优酷 JSON 页面。
- [B站请求脚本](https://raw.githubusercontent.com/kokoryh/Sparkle/caf42c487706787431109cc105e93fcec8fc61cd/dist/bilibili.protobuf.request.js)、[B站响应脚本](https://raw.githubusercontent.com/kokoryh/Sparkle/caf42c487706787431109cc105e93fcec8fc61cd/dist/bilibili.protobuf.response.js)：Sparkle 上游兼容更新。
- [manifest.json](manifest.json)：提交、SHA-256、字节数和脚本绑定次数。
- 原插件及视频脚本基线：[ifflagged/Romeo](https://github.com/ifflagged/Romeo/tree/d27c811fbabc7b16d5bce4937e7b6672d48f89f1)。原作者 fmz200 等作者信息和注释保留。
- 开屏及播放页对照：[fkingikelee/fkikelee](https://github.com/fkingikelee/fkikelee/tree/e9c1c92f73999b5e17541d5ebaaefe763f8550bb/lpx)，仅采用已核对的相关规则并修正。
- [上一版发布快照](https://github.com/xw-yin/loon-cf-opt/tree/74720917ac7284459b27cb3f0648c67a35e90cbc/adblock/v2)可用于回退到 v2.1；更早的 v2.0 快照为提交 `b4eecf4`。
