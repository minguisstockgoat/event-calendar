/**
 * KRX 실시간 시세 프록시 (Cloudflare Worker)
 * 브라우저는 CORS 때문에 네이버 시세 API를 직접 못 부르므로 이 워커가 중계한다.
 *   GET /?codes=005930,069540  ->  {quotes:{"005930":{price,change_pct,state,time},...}}
 * 배포: worker/DEPLOY.md 참고. 배포 후 index.html 의 QUOTE_PROXY 에 워커 URL 지정.
 */
export default {
  async fetch(req) {
    const cors = {
      "Access-Control-Allow-Origin": "*",
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    };
    const url = new URL(req.url);
    const codes = (url.searchParams.get("codes") || "")
      .split(",").map(c => c.trim()).filter(c => /^\d{6}$/.test(c)).slice(0, 40);
    if (!codes.length)
      return new Response('{"error":"codes required (6-digit, comma-sep, max 40)"}',
                          { status: 400, headers: cors });
    const out = {};
    await Promise.all(codes.map(async code => {
      try {
        const r = await fetch(
          `https://polling.finance.naver.com/api/realtime/domestic/stock/${code}`,
          { headers: { accept: "application/json" } });
        const j = await r.json();
        const d = j && j.datas && j.datas[0];
        if (d && d.closePrice) out[code] = {
          price: Number(String(d.closePrice).replace(/,/g, "")),
          change_pct: Number(String(d.fluctuationsRatio || "").replace(/,/g, "")) || 0,
          state: d.marketStatus || "",
          time: d.localTradedAt || "",
        };
      } catch (e) { /* 종목 단위 실패는 무시 */ }
    }));
    return new Response(JSON.stringify({ quotes: out, at: new Date().toISOString() }),
                        { headers: cors });
  },
};
