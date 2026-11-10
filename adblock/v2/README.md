# Loon 广告拦截修复版 v2.10.0（远程脚本）

[导入或更新插件](https://raw.githubusercontent.com/xw-yin/loon-cf-opt/main/adblock/v2/blockAdsV2.fixed.v2.remote.plugin) · [当前目录](https://github.com/xw-yin/loon-cf-opt/tree/main/adblock/v2)

本目录基于本地修复 v2，更新了 B 站空降助手兼容方案。导入地址保持不变，酷安及视频页面的两份修复 JS 继续远程加载，无需导入本地脚本。

v2.10.0（2026-11-10）：按用户指令整段换掉 YouTube 实现——devchristian1337 版后台播放无效，改用 Kelee 收录的 Maasea 版「YouTube去广告」（.lpx 头日期 2026-10-02）。换入前已完成审计并报用户：Maasea 官方构建（2026-07-19 build，esbuild 打包非混淆），画中画/后台播放靠 protobuf 层改 pictureInPictureAbility/backgroundAbility 能力字段 + initplayback 的 UMP 处理；唯一外发是 initplayback 命中缓存 key 时重定向到作者 Worker（init-stream.maasea.workers.dev）处理 UMP，与此前审过的 fking 版同一套核心；存储只读写自有两键（YouTubeConfig/YouTubeAdvertiseInfo），无凭据处理。两脚本 pin 在 Romeo @e8135d0b9d，哈希与审计版逐字节一致（request af064689…、response b926d339…）。变更面：参数 16→5（隐藏上传/Shorts/选段按钮、字幕翻译语言 captionLang、调试模式）、绑定 12→3、Rewrite 删 initplayback 的 reject_video（会挡住新脚本处理 initplayback）；Alt-Svc clear 特意保留，让 googlevideo 保持走 TCP、initplayback 能稳定进脚本。devchristian 独有的屏蔽频道/日志工具/画质研究随之移除；字幕翻译改由 captionLang 在响应侧处理。待真机验证：画中画、后台播放（锁屏/切 App 续播）、字幕加载与翻译、信息流/播放页广告、三个底栏按钮开关、YouTube Music。

v2.9.3（2026-11-10）：按用户拍板把 YouTube 两个脚本的 pin 从 Romeo @ff465b59 升到 @e8135d0b9d（12 条绑定，Spotify 的 fking 脚本 pin 不动）。新版脚本与 v2.9.2 变更说明里审计过的版本逐字节一致（request sha256 b38e2180…、response sha256 4689a316…）：eml-fe 广告标记哈希后缀正则 {16}→{1,16}、search 续页 protobuf 字段映射 +1、eml 命令校验多接受一个字段号；无新外发、无新主机，后台播放逻辑未动（画中画问题与此无关）。

v2.9.2（2026-11-10）：YouTube 说明中文化——16 个参数的英文 desc 全部译成中文（参数名、默认值、选项值一字未动），10 条脚本绑定的英文 tag 一并译成中文；纯文案变更，无功能变化。同批检查原插件更新：devchristian1337 YouTube 的 .lpx 本体自 pin @ff465b59 后只有 #!date 变化（2026-11-01→2026-11-07），参数与绑定无变化；但其两个脚本（request/response.min.js）在 Romeo 2026-11-08 同步中有小幅更新，已逐段比对审计：广告标记 eml-fe 的哈希后缀正则由固定 16 位放宽为 1–16 位、search 续页的 protobuf 字段映射补一字段、eml 命令校验多接受一个字段号——均为跟随 YouTube 服务端标记/结构漂移的适配，无新外发、无新主机、后台播放逻辑未动。是否把脚本 pin 升到新版由用户拍板（升 pin 后版本号顺延）。

v2.9.1（2026-11-10）：按用户决定把 ddgksf2013 的 bdpan.unlock.js 还原成可读版再加入——原版 48KB 全混淆（sha256 00615ce6…），经 webcrack 静态反混淆读出全部逻辑，再将原版放入沙箱喂 11 组样本动态运行，还原版输出逐字一致（原版实测零网络调用、零通知、零存储）。还原版自托管于本仓库 restored_bdpan_unlock.js（pin @c6953ada），与原版唯一刻意差异是把 tips 载荷里 3 处作者 Telegram 频道推广链接置空。插件只挂两条实际生效的绑定（与 chxm 解锁共用开关 bdwp_unlock_enable）：api/streaming 请求把 type=M3U8_HQ_1080 改写为 M3U8_AUTO_1080（倍速/高清核心）、rest/…/membership/user 响应替换为其 SVIP 伪造载荷；原版另有的 getsyscfg/afd/entry 两路已被 [Rewrite] 的请求级 reject 覆盖、feed/cardinfos 与 chxm 处理趋同，未重复挂绑定（还原脚本内仍保留全部分支，单独使用时完整可用）。

v2.9.0（2026-11-10）：四家开屏复发专项 + 百度网盘会员解锁（均先审计后合入）。IT之家：此前对开屏零覆盖，补 dat.ruanmei.com/ithome/money/acd.json reject，MITM 补 dat.ruanmei.com（924→925）。淘宝：脚本无更新（现行 fmz200 版是 Kelee 脚本的超集），补开屏图新式 URL 三条（heic 转码图 png/jpg 两式 + gw.alicdn webp 全屏图）与 wireless.home.splash.awesome.get 直拒（源 ishowshu 2026-05-27，Romeo 双源一致）。酷安：接口 jq 已是最新并集，漏在开屏聚合 SDK 域名池，补 pangolin-sdk-toutiao-b.com、pglstatp-toutiao.com、kuaishouzt.com、kwaiad.com 的 DOMAIN-SUFFIX + QUIC 拒绝共 8 条。百度网盘：补新开屏接口 5 条（buy/ad/conf|get|analytics、membership/advertise/dsp、api/analytics 的 splash/bidding）与 vlion.cn、advlion.com 域名 + QUIC 4 条。另按要求加入会员解锁脚本 chxm1023 bdcloud.js（pin @1f9dd763，新增开关 bdwp_unlock_enable 默认开）：审计结论——全可读、零网络调用、零存储、零凭据处理，仅本地改写响应，伪造 SVIP10 至 2099 年只影响客户端显示与本地功能门，服务端权益不由客户端字段决定，quota 显示 30TB 为虚假显示。同源的 ddgksf2013 倍速 unlock 脚本为全混淆构建，按规矩未收（其 membership/user 部分与 chxm 重叠，独有的是 streaming 1080P 请求头处理）。

v2.8.0（2026-11-07）：Spotify 换源——由 v2.7.0 的 devchristian 版改为 fking 版 Spotify_remove_ads（001ProMax 线，Romeo 托管）：参数换为 tab/useractivity 两个，Rule 1 条、Rewrite 2 条、Script 1 条，MITM 的 *spclient.spotify.com 改为 *-spclient.spotify.com（总数仍 924）。审计结论：其脚本（pin @ff465b59）零网络调用、零存储、无任何外部主机，纯本地处理。同批审计的 fking 版 YouTube 未采用：其 request 脚本会把 initplayback 请求重定向到作者的 Cloudflare Worker（init-stream.maasea.workers.dev）处理，完整播放请求经第三方服务器，按审计规矩报用户后拍板不收；YouTube 维持 v2.7.0 的 devchristian 版不变。

v2.7.0（2026-11-07）：按要求把 Spotify 与 YouTube 两个独立插件整合进合集（v2.6.1 删的是 fmz200 老实现，本次整合的是在用的 devchristian1337 独立插件：Spotify 本体 + Romeo 托管的 YouTube Beta）。内容与原插件一一对应：新增参数 20 个（Spotify 4 + YouTube 16，tag 已中文化）、Rule 6 条、Rewrite 7 条、Script 18 条（Spotify 经典绑定 6 + YouTube 条件绑定 12）、MITM 补 9 主机（915→924，含 *.googlevideo.com）。脚本按本仓库惯例 pin 到审计过的提交（Spotify @b0c19b2、YouTube @ff465b59；两个 .lpx 本体与 2026-11-05 审计版本逐字节一致）。审计结论（2026-11-07 复扫 pin 版本）：Spotify 四个小脚本零网络调用，两个 protobuf 捆包的 XHR/fetch/eval 均为 protobufjs 库内代码；YouTube 唯一外发是下载用户自填的屏蔽频道列表（默认空、不带 cookie），其余 fetch 命中为其本地日志页面（日志工具默认关）。注意：整合后请停用/删除原来的两个独立插件，避免同一请求被处理两遍；两插件按原设计没有总开关，核心去广告绑定常开，各功能由自带参数控制。

v2.6.2（2026-11-04）：修复酷安 jq 不生效——v2.5.3 把 7 条酷安 jq 误置于 [Script] 段，而本插件全部 110 条 jq 均在 [Rewrite] 段执行、[Script] 段的 jq 不被处理，症状为广告与改前完全一致。7 条 jq 已移回 [Rewrite] 段酷安块；[Script] 段只保留酷安重定向脚本。

v2.6.1（2026-11-03）：按要求整段删除 YouTube 与 Spotify（用户有单独插件）：删两应用在 Rewrite/Script 的全部分段、Rule 里的 ads.youtube.com、youtube_enable 开关与 4 个 MITM 主机（919→915）；此后这两个应用的流量不再被本合集解密处理。

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
