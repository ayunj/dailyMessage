# dailyMessage

텔레그램 **봇 1개**로 **여러 채팅방**에 메시지를 보내고, 채팅방별로 **언어(ja/en/zh)** 설정을 저장하는 Node.js(Typescript) 프로젝트입니다.

## 기능(현재 스캐폴딩)
- 텔레그램 웹훅 수신: `POST /telegram/webhook`
- 채팅방 등록/설정 커맨드
  - `/register`: 이 채팅방 활성화
  - `/unregister`: 이 채팅방 비활성화
  - `/lang ja|en|zh`: 이 채팅방 언어 설정
  - `/ping`: 테스트 응답
- Firestore에 채팅방 설정 저장(운영용)
- (수동/스케줄) 오늘의 일본어 푸시: `POST /jobs/ask-now` (헤더 `X-Jobs-Api-Key` 필요)

## 로컬 실행
1) 환경변수 준비

```bash
copy .env.example .env
```

2) 설치/실행

```bash
npm install
npm run dev
```

## 텔레그램 웹훅 설정(개요)
Cloud Run URL이 `https://YOUR-SERVICE.a.run.app` 이면, 웹훅은 `https://YOUR-SERVICE.a.run.app/telegram/webhook` 입니다.

보안 강화를 위해 `TELEGRAM_WEBHOOK_SECRET`를 설정하고, 텔레그램에 웹훅을 등록할 때 secret token도 함께 지정하세요.

## 다음 단계(원하시면 이어서 구현)
- AI 서비스 연결(OpenAI 등) 및 채팅방별 언어로 답변 생성/번역
- Cloud Scheduler로 매일/매시간 자동 전송 잡(`/jobs/ask-now`)

