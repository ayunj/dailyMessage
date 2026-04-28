# daily-message (Gemini → Telegram)

Google Cloud Run(또는 Cloud Functions)에서 실행되는 HTTP 트리거 함수 `helloHttp`가,
Google Gemini API로 단어/예문을 생성한 뒤 Telegram Bot API로 전송합니다.

현재 기본은 일본어(`ja`)이며, 추후 영어/중국어를 `src/languages/`에 추가하는 구조입니다.

## 준비물

- Telegram Bot Token (`TELEGRAM_TOKEN`)
- 메시지를 받을 채팅 ID (`CHAT_ID`)
- Gemini API Key (`GEMINI_API_KEY`)
- 단어 히스토리 저장 위치(둘 중 하나)
  - 로컬 파일: `WORD_HISTORY_PATH` (미지정 시 기본: `data/word-history.json`)
  - **재기동에도 유지되는 영구 저장(권장)**: `WORD_HISTORY_GCS_URI` (예: `gs://<bucket>/dailyMessage/word-history.json`)

## 로컬 실행

```bash
npm install

# PowerShell 예시
$env:TELEGRAM_TOKEN="xxxxx"
$env:CHAT_ID="123456789"
$env:GEMINI_API_KEY="yyyyy"
$env:WORD_HISTORY_PATH="data/word-history.json"

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

### 단어 히스토리 영구 저장(재기동에도 유지)

Cloud Run/Cloud Functions 환경은 컨테이너 파일시스템이 휘발성이므로, 로컬 파일(`data/word-history.json`)에 저장하면
재기동/스케일링 시 사라질 수 있습니다. 아래처럼 Cloud Storage에 JSON을 저장하도록 설정하면 영구 유지됩니다.

- 환경 변수: `WORD_HISTORY_GCS_URI=gs://<bucket>/dailyMessage/word-history.json`
- 서비스 계정 권한: 해당 버킷/오브젝트에 대한 `storage.objects.get` / `storage.objects.create` / `storage.objects.update`

## 함수

- 함수명: `helloHttp`
- 엔트리: `index.js`

