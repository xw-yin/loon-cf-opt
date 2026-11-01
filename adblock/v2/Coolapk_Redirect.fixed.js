// 酷安 URL 重定向：修正原脚本顶层 return，并处理无效编码。
// 将本文件放入 Loon 本地脚本目录，文件名保持不变。
// 基于 VenenoSix24_Coolapk_Redirect.js 的相同重定向用途重新实现。
(() => {
  let result = {};
  try {
    const source = String($request.url || "");
    if (/^https:\/\/www\.coolapk\.com\/link(?:[/?#]|$)/i.test(source)) {
      const match = /[?&]url=([^&#]+)/i.exec(source);
      if (match) {
        const target = decodeURIComponent(match[1]);
        if (/^https?:\/\/[^\s/]+(?:[/?#]|$)/i.test(target) && !/[\r\n]/.test(target)) {
          result = {
            response: {
              status: 302,
              headers: { Location: target, "Cache-Control": "no-cache" },
              body: ""
            }
          };
        }
      }
    }
  } catch (_) {
    // URL 编码无效时保留原请求，仍然只调用一次 $done。
  }
  $done(result);
})();
