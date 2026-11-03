// 财新 App 广告配置处理（洁净还原版）
// 还原自 fmz200_caixinAd.js（jsjiami 混淆版，2026-11-03 经字符串解码 + 沙箱动态运行双向验证，逻辑仅此而已）：
// gg.caixin.com 返回的广告配置里含 sday/eday（投放起止日期）与 intval（间隔）。
// 把起止日期改写到 2029 年、间隔置 0，广告位即视为「未到投放期」而不展示。
// 无任何网络请求、不读写本地存储、只处理该接口的响应体。
let body = $response.body;
if (body) {
  body = body
    .replace(/sday":"[^"]*"/g, 'sday":"2029-12-01 00:00:00"')
    .replace(/eday":"[^"]*"/g, 'eday":"2029-12-30 00:00:00"')
    .replace(/intval":\d/g, 'intval":0');
  $done({ body });
} else {
  $done({});
}
