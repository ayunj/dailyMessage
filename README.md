# daily-message (Gemini → Telegram)

Google Cloud Run(또는 Cloud Functions)에서 실행되는 HTTP 트리거 함수 `helloHttp`가,
Google Gemini API로 단어/예문을 생성한 뒤 Telegram Bot API로 전송합니다.

현재 기본은 일본어(`ja`)이며, 추후 영어/중국어를 `src/languages/`에 추가하는 구조입니다.

## 준비물

- Telegram Bot Token (`TELEGRAM_TOKEN`)
- 메시지를 받을 채팅 ID (`CHAT_ID`)
- Gemini API Key (`GEMINI_API_KEY`)

## 로컬 실행

```bash
npm install

# PowerShell 예시
$env:TELEGRAM_TOKEN="xxxxx"
$env:CHAT_ID="123456789"
$env:GEMINI_API_KEY="yyyyy"

npm run dev
```

테스트 호출:

```bash
curl http://localhost:8080
```

언어 선택(확장 포인트):

```bash
curl "http://localhost:8080?lang=ja"
```

## Cloud Run 배포(예시)

Cloud Run은 컨테이너 기반이므로, 보통 아래 2가지 중 하나로 배포합니다.

1) **소스 기반 빌드**(Cloud Buildpacks)로 배포  
2) Dockerfile을 추가해 컨테이너로 배포

이 프로젝트는 `npm start`가 `PORT=8080`에서 `functions-framework`를 실행하도록 되어 있어,
Cloud Run 소스 기반 배포에 바로 맞습니다.

## 함수

- 함수명: `helloHttp`
- 엔트리: `index.js`

