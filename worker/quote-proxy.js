/**
 * KRX 실시간 시세 프록시 (Cloudflare Worker)
 * 브라우저 CORS 제약 때문에 이 워커가 시세 API를 중계한다.
 * 소스: Daum 금융(1순위) -> Naver 폴백. 둘 다 실시간 국내 시세.
 *   GET /?codes=005930,069540   -> {quotes:{"005930":{price,change_pct,time},...}}
 *   GET /?codes=005930&debug=1  -> 소스별 HTTP 상태 포함 (문제 진단용)
 *   GET /?candles=005930&days=250 -> {candles:[{t,o,h,l,c,v},...]} 일봉 (오래된 것부터)
 */
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
};

async function fromDaum(code) {
  const r = await fetch(`https://finance.daum.net/api/quotes/A${code}`, {
    headers: {
      accept: "application/json",
      referer: `https://finance.daum.net/quotes/A${code}`,
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    },
  });
  if (!r.ok) throw new Error("daum " + r.status);
  const j = await r.json();
  if (!j.tradePrice) throw new Error("daum no price");
  return {
    price: j.tradePrice,
    change_pct: Math.round((j.changeRate || 0) * 10000) / 100
      * (j.change === "FALL" ? -1 : 1),
    time: (j.tradeTime || "").replace(/(\d{2})(\d{2})(\d{2})?/, "$1:$2"),
    src: "daum",
  };
}

async function fromNaver(code) {
  const r = await fetch(
    `https://polling.finance.naver.com/api/realtime/domestic/stock/${code}`,
    { headers: { accept: "application/json" } });
  if (!r.ok) throw new Error("naver " + r.status);
  const j = await r.json();
  const d = j && j.datas && j.datas[0];
  if (!d || !d.closePrice) throw new Error("naver no price");
  return {
    price: Number(String(d.closePrice).replace(/,/g, "")),
    change_pct: Number(String(d.fluctuationsRatio || "").replace(/,/g, "")) || 0,
    time: d.localTradedAt || "",
    src: "naver",
  };
}

// 일봉 캔들 (Daum 차트 API). 종가 기준 수정주가.
async function candles(code, days) {
  const r = await fetch(
    `https://finance.daum.net/api/charts/A${code}/days?limit=${days}&adjusted=true`, {
      headers: {
        accept: "application/json",
        referer: `https://finance.daum.net/quotes/A${code}`,
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      },
    });
  if (!r.ok) throw new Error("daum charts " + r.status);
  const j = await r.json();
  const rows = (j.data || []).map(d => ({
    t: String(d.date || d.candleTime || "").slice(0, 10),   // YYYY-MM-DD
    o: d.openingPrice, h: d.highPrice, l: d.lowPrice,
    c: d.tradePrice, v: d.candleAccTradeVolume,
  })).filter(d => d.t && d.c != null);
  rows.sort((a, b) => a.t.localeCompare(b.t));
  return rows;
}

export default {
  async fetch(req) {
    const url = new URL(req.url);

    // --- 일봉 캔들 모드 ---------------------------------------------------
    const cndl = url.searchParams.get("candles");
    if (cndl) {
      if (!/^\d{6}$/.test(cndl))
        return new Response('{"error":"candles must be a 6-digit code"}',
                            { status: 400, headers: CORS });
      const days = Math.min(Math.max(+(url.searchParams.get("days") || 250), 10), 1500);
      try {
        const rows = await candles(cndl, days);
        return new Response(JSON.stringify({ code: cndl, candles: rows }), {
          headers: { ...CORS, "cache-control": "public, max-age=600" },
        });
      } catch (e) {
        return new Response(JSON.stringify({ error: String(e) }),
                            { status: 502, headers: CORS });
      }
    }

    const codes = (url.searchParams.get("codes") || "")
      .split(",").map(c => c.trim()).filter(c => /^\d{6}$/.test(c)).slice(0, 40);
    if (!codes.length)
      return new Response('{"error":"codes required (6-digit, comma-sep, max 40)"}',
                          { status: 400, headers: CORS });
    const debug = url.searchParams.get("debug") === "1";
    const out = {}, errs = {};
    await Promise.all(codes.map(async code => {
      try { out[code] = await fromDaum(code); return; }
      catch (e) { if (debug) errs[code] = [String(e)]; }
      try { out[code] = await fromNaver(code); }
      catch (e) { if (debug) (errs[code] = errs[code] || []).push(String(e)); }
    }));
    const body = { quotes: out, at: new Date().toISOString() };
    if (debug) body.errors = errs;
    return new Response(JSON.stringify(body), { headers: CORS });
  },
};
