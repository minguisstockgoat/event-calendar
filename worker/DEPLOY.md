# 시세 프록시 Worker 배포 (1회)

전제: Node.js 설치(완료), Cloudflare 계정.

```bash
cd worker
npx wrangler login      # 브라우저가 열리면 Allow 클릭 (Cloudflare 로그인)
npx wrangler deploy     # 출력되는 https://krx-quote-proxy.<계정>.workers.dev 복사
```

마지막으로 `index.html` 상단의 `const QUOTE_PROXY = ''` 에 워커 URL을 넣고
commit/push 하면, 대시보드의 "↻ 시세" 버튼이 실시간(네이버 시세) 모드로 바뀐다.
미설정 상태에서는 버튼이 최신 정적 데이터 재로드로 동작한다.
