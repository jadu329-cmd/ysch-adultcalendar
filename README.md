# 부서 월간 일정표

월간 일정을 관리하는 웹 애플리케이션입니다. Firebase를 사용하여 데이터를 저장하고, GitHub Actions를 통해 자동 배포됩니다.

## 주요 기능

- 📅 월간 캘린더 표시
- ➕ 일정 추가/수정/삭제
- 🎨 색상 선택 (9가지 색상)
- 📆 기간 일정 지원
- 🖱️ 드래그 앤 드롭으로 일정 이동
- 📊 Excel 파일 업로드 (일괄 일정 추가)
- 📋 전월 일정 복사 기능
- 🔄 로컬 데이터 동기화

## 시작하기

### 1. 의존성 설치

```bash
npm install
```

### 2. Firebase 설정

1. Firebase 콘솔에서 새 프로젝트 생성
2. Firestore Database 생성 (테스트 모드로 시작)
3. `src/firebase/config.js` 파일에 Firebase 설정 정보 입력:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
}
```

### 3. 개발 서버 실행

```bash
npm run dev
```

### 4. 빌드

```bash
npm run build
```

빌드된 파일은 `dist` 폴더에 생성됩니다.

## Firebase 배포 설정

### 1. Firebase CLI 설치 (전역)

```bash
npm install -g firebase-tools
```

### 2. Firebase 로그인

```bash
firebase login
```

### 3. Firebase 프로젝트 초기화

```bash
firebase init hosting
```

- Public directory: `dist`
- Single-page app: Yes
- GitHub Actions 자동 배포: Yes (또는 나중에 설정)

### 4. Firebase 배포

```bash
firebase deploy --only hosting
```

## GitHub Actions 자동 배포 설정

### 1. Firebase 토큰 생성

```bash
firebase login:ci
```

이 명령어를 실행하면 토큰이 출력됩니다. 이 토큰을 복사하세요.

### 2. GitHub Secrets 설정

1. GitHub 저장소로 이동
2. Settings > Secrets and variables > Actions
3. New repository secret 생성
   - Name: `FIREBASE_TOKEN`
   - Value: 위에서 복사한 Firebase 토큰

### 3. GitHub Actions 워크플로우

`.github/workflows/deploy.yml` 파일이 이미 설정되어 있습니다. `main` 브랜치에 푸시하면 자동으로 빌드되고 Firebase에 배포됩니다.

## 사용 방법

### 일정 추가

1. 캘린더에서 날짜 클릭
2. 일정 제목 입력
3. 색상 선택
4. 기간 일정인 경우 체크박스 선택 후 시작일/종료일 입력
5. 저장 버튼 클릭

### 일정 수정/삭제

1. 일정 클릭
2. 수정 후 저장 또는 삭제 버튼 클릭

### 일정 이동

1. 일정을 드래그하여 원하는 날짜로 이동

### 전월 일정 복사

1. 상단의 "전월 일정 복사" 버튼 클릭
2. 확인 후 현재 월로 복사됨

### Excel 파일 업로드

1. 상단의 "엑셀 파일 업로드" 버튼 클릭
2. Excel 파일 선택
3. 파일 형식:
   - 컬럼: 날짜, 제목, 색상 (선택)
   - 날짜 형식: YYYY-MM-DD 또는 Excel 날짜 형식

## 초기 데이터

`src/data/initialSchedules.js` 파일에 2025년 12월 초기 일정 데이터가 포함되어 있습니다. 처음 앱을 실행하면 자동으로 로드됩니다 (기존 데이터가 없는 경우에만).

## 기술 스택

- React 18
- Vite
- Firebase (Firestore)
- date-fns
- xlsx (Excel 파일 처리)

## 라이선스

MIT

