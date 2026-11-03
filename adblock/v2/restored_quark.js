// 夸克/UC open-cms 内容处理（洁净还原版）
// 还原自 fmz200_quark.js（jsjiami.com.v7 混淆版，2026-11-03 经 webcrack 反混淆 +
// 字符串解码器还原 + 沙箱动态运行双向验证，业务逻辑仅此而已）：
// open-cms-api 响应 JSON 的 result 对象里，键名含 "cms_" 的是 CMS 推广/广告位，
// 逐个删除后回写响应体。
// 无任何网络请求、不读写本地存储、只处理该接口的响应体。
try {
  const obj = JSON.parse($response.body);
  if (obj && obj.result && typeof obj.result === "object") {
    for (const key of Object.keys(obj.result)) {
      if (key.includes("cms_")) delete obj.result[key];
    }
  }
  $done({ body: JSON.stringify(obj) });
} catch (e) {
  $done({});
}
