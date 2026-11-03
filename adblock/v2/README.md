# Loon 广告拦截修复版 v2.6.0（远程脚本）

[导入或更新插件](https://raw.githubusercontent.com/xw-yin/loon-cf-opt/main/adblock/v2/blockAdsV2.fixed.v2.remote.plugin) · [当前目录](https://github.com/xw-yin/loon-cf-opt/tree/main/adblock/v2)

本目录基于本地修复 v2，更新了 B 站空降助手兼容方案。导入地址保持不变，酷安及视频页面的两份修复 JS 继续远程加载，无需导入本地脚本。

v2.6.0（2026-11-03）：五个常用 App 按深查结果升级（均已审计：新增远程脚本 4 份逐个静态扫描，零网络调用、零存储写入、无混淆）——京东换 ccyykk666（2026-10-31）jq+JS 合并版并新增 HomeClean/OrderAds/ProfileClean/ProductClean 四个开关，fmz200 老脚本收窄到仅剩 start 接口；拼多多由 3 条 reject 补成 sooyaaabo 全套 45 条（reject+jq+rucu6 脚本）；高德以 Kelee jq（2026-10-20）为主并集 sooyaaabo 独有接口与 rucu6_amap.js；滴滴取 mist-whisper ∪ sooyaaabo 的 jq 并集（新增城际/POI/旅行等），未被覆盖的原 JS 绑定保留；腾讯视频原规则此前全部注释（零覆盖），以 sooyaaabo 版正式启用。MITM 补 16 个主机（ai/info/center.amap.com、api.udache.com、poi.map.xiaojukeji.com、i.video.qq.com、rdelivery.qq.com 等），总数 919。注意：新增 jq 绑定按插件惯例不受各 App 旧开关控制。

v2.5.3（2026-11-03）：酷安改 jq 合并版——因酷安服务端更换广告标记，2023 年的 fmz200 标记脚本整批漏过。新版取 sooyaaabo（2026-11-02 版）新标记与原标记的并集：init 新删 24455/36839/1635 及「关注」、indexV8 增 28621 并保留 sponsorCard 检查、page/dataList 增 13 个推广 ID、新增 /account/loadConfig（我的页卡片）绑定、热搜 reject 由注释改为启用；fmz200_coolapk.js 远程脚本退役（少一份远程信任）。jq 表达式已用本地 jq 对样本数据做过功能验证。注意：jq 绑定与插件内其他 jq 一致不受 kuan_enable 开关控制（开关现只管酷安重定向脚本）。

v2.5.2（2026-11-03）：财新、夸克以洁净还原版加回——原 jsjiami 混淆脚本经反混淆 + 沙箱动态运行双向验证（财新：广告配置日期改写 2029 + 间隔置 0；夸克：删除 open-cms 响应 result 里的 cms_* 推广位；两者均零网络、零存储），还原为十余行可读脚本自托管于本仓库（restored_caixin.js / restored_quark.js，pin 在 bf845cd）。MITM 补回 gg.caixin.com 与 open-cms-api.(uc|quark).cn（夸克主机此前不在名单内、原绑定实际未生效，本版起真正生效）。

v2.5.1（2026-11-03）：按要求摘除 B 站空降助手——删 bilibili.airborne 绑定、sponsorBlock 开关、响应脚本的 sponsorBlock 参数与 `DOMAIN,bsbsb.top,PROXY` 规则；此后不再向 bsbsb.top 发送所看视频的 ID。B 站其余净化（请求优化、响应净化、直播、Tab/我的页 jq）保留。

## v2.5 变更（2026-11-03：微博 17 条修复 + 安全审计收敛）

1. **修复 v2.4 微博段 17 条脚本绑定无法解析**：正则里 `c(?:n|om)/2` 有一处 `/` 未转义，JS 正则字面量被提前截断，Loon 报「17 条异常脚本配置无法解析」，这 17 条（信息流/详情/评论/视频/主页/超话/消息/搜索等）此前实际未生效；已改为 `c(?:n|om)\/2`，全插件脚本配置复检 0 异常。
2. **安全审计收敛**（全量审计 79 个远程脚本：未发现外发请求头/正文/Cookie 的调用点）：
   - 摘除 2 条 jsjiami 全混淆脚本绑定：财新 fmz200_caixinAd.js、夸克 fmz200_quark.js（及孤儿开关 cdxb_enable、kxke_enable）；财新/夸克的域名级 reject 规则保留。
   - 整段摘除银行/支付/证券类：工行/建行/中行/农行/交行/招行/邮储/光大/中信/民生/浦发/平安/兴业/华夏/汇丰及各城商行、拉卡拉/财付通/翼支付/银盛/合利宝、富途/华泰/国泰君安/长城证券、同花顺/东方财富/雪球/金十、币安、小米金融/京东金融等——共摘 [Rewrite]/[Script]/[Rule] 条目 82 条、MITM 主机名 81 个（981→900）、孤儿开关 3 个（另含买单吧 mddjba_enable）。这些 App 的去广告随之失效（开屏广告会回来），其流量不再被本插件 MITM 解密。
   - 已知保留项：B 站空降助手按设计向 bsbsb.top 发送所看视频的 ID 查跳过片段（不带 cookie/请求头），不用可在插件参数关 sponsorBlock。

## v2.4 变更（微博：合集原本零覆盖，本版新增整段）

反馈：微博广告出现。核查发现合集对微博主客户端**没有任何有效覆盖**——只有 [Rule] 里 76 条 sina.com.cn 旧网页广告域名，微博 App 的流量走 api.weibo.cn、根本不经过这些域名，MITM 里也没有任何 weibo 主机。

做法：新增 `# > 微博` 段，取当前维护中的 Kelee（RuCu6/zmqcherish 开源线，2026-10-02 新格式版）整套方案，合并 sooyaaabo 2026-10-19 合并版与墨鱼的增量：

- **[Script] 20 条绑定**，同一支主脚本 `kelee_weibo_remove_ads.js`（56.7KB，2026-04-23 版）：信息流、详情页、评论区、视频流、个人主页、超话、消息页、私信列表全覆盖，开屏走 bootpreload/sdkad/wbapplua 三处脚本处理。脚本为可读开源代码（非混淆），已自托管并固定在本仓库提交 `4ebeced`。
- **[Rewrite] 24 条**：Kelee 的 reject_dict 集合（签到/推送/弹幕/投票/发现页/搜索引导/红包/uve 实时广告/sdkconfig/文章打赏广告）+ sooyaaabo 的 logservice 404 与 cardlist jq（删 group 类条目）+ 墨鱼 3 条独有 reject（ad/preload、profile/recommend_popuser、account/recommend_interesttags）与 uve 点击/曝光上报 reject。api 主机按 sooyaaabo 写法放宽为 `m?api.weibo.c(n|om)`，兼容新版客户端的 mapi 主机。
- **[Rule] 3 条**：uve.weibo.com DIRECT（上游同款放行）、huodong.weibo.cn 与 biz.weibo.com REJECT。
- **[MITM]** 补 `*.weibo.cn, *.weibo.com, weibo.com`。

未收：墨鱼的 weibo_json 脚本（与 Kelee 脚本覆盖同一批接口，不重复挂）；sooyaaabo 的顶部 Tab 分组开关与会员图标脚本（功能向、非广告）。微博轻享版（国际版）不在本次范围。

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
