# 자본조달 이벤트 캘린더

진행 중인 유·무상증자, CB·BW·EB 발행 이벤트의 남은 일정을 기업별 시계열로 보여주는
정적 대시보드. DART 공시에서 추출한 일정(권리락·기준일·청약·납입·상장·공매도 제한
구간·전환청구 기간)과 이후 실제 접수된 후속 공시(발행가 확정, 청약결과 등)를
타임라인 하나로 합쳐서 표시한다.

- 데이터: `calendar_data.json` — Mac의 event-intel 전용 작업이 평일 08:15 / 17:45 수집·재생성·push
- 자동 실행: `com.wondaehan.event-calendar-refresh` (로그인할 때도 누락분 확인)
- 수집: `event-intel/scripts/sync_calendar.py` — 마지막 성공일부터 3일 겹쳐 공시 수집, 정정 반영, 최근 35일 KRX 종가 캐시 보충. 보고서·메시지 발송 없이 공시 팩트만 갱신.
- 수집 기준일·종가 기준일은 JSON의 `meta` 및 화면 하단에서 확인. KRX 종가는 전일까지 제공.
- 실행 기록: `event-intel/logs/calendar_push.log`, 체크포인트: `event-intel/state/calendar_sync.json`
- 예약 작업은 `event-intel/mac/push_calendar.sh`를 사용하며 `.calendar-approved`가 있어야 실행. `EVENT_CALENDAR_DEPLOY_ENABLED=1`일 때 생성 데이터만 배포.
- 테마: Ocean Depths (deep navy · teal · seafoam · cream)
- 공시 기반 정리 자료이며 투자자문이 아님. 권리락일·기준가는 추정치 포함.
