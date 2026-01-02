# Firebase 연동 가이드

## 현재 상황

데이터는 **Firebase Firestore**에 저장되도록 설계되어 있습니다. Firebase가 설정되지 않으면 일정 데이터를 저장하거나 불러올 수 없습니다.

## Firebase 연동 절차

### 1단계: Firebase 프로젝트 생성

1. [Firebase 콘솔](https://console.firebase.google.com/) 접속
2. "프로젝트 추가" 클릭
3. 프로젝트 이름 입력 (예: `monthly-schedule`)
4. Google Analytics 설정 (선택사항)
5. 프로젝트 생성 완료

### 2단계: Firestore Database 생성

1. Firebase 콘솔에서 생성한 프로젝트 선택
2. 왼쪽 메뉴에서 **"Firestore Database"** 클릭
3. **"데이터베이스 만들기"** 클릭
4. 보안 규칙 선택:
   - **"테스트 모드에서 시작"** 선택 (개발 중에는 테스트 모드 사용)
   - 위치 선택 (예: `asia-northeast3` - 서울)
5. 데이터베이스 생성 완료

### 3단계: 웹 앱 등록

1. Firebase 프로젝트 홈페이지에서 **⚙️ 설정 > 프로젝트 설정** 클릭
2. 아래로 스크롤하여 **"내 앱"** 섹션 찾기
3. **</> (웹) 아이콘** 클릭
4. 앱 닉네임 입력 (예: `monthly-schedule-web`)
5. **"앱 등록"** 클릭
6. **Firebase SDK 구성** 화면에서 설정 정보 확인:
   ```javascript
   const firebaseConfig = {
     apiKey: "AIza...",
     authDomain: "your-project.firebaseapp.com",
     projectId: "your-project-id",
     storageBucket: "your-project.appspot.com",
     messagingSenderId: "123456789",
     appId: "1:123456789:web:abcdef"
   }
   ```

### 4단계: 프로젝트에 Firebase 설정 추가

1. 프로젝트의 `src/firebase/config.js` 파일 열기
2. 위에서 복사한 Firebase 설정 정보로 교체:

```javascript
import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'

// Firebase 설정
const firebaseConfig = {
  apiKey: "여기에_API_KEY_입력",
  authDomain: "여기에_AUTH_DOMAIN_입력",
  projectId: "여기에_PROJECT_ID_입력",
  storageBucket: "여기에_STORAGE_BUCKET_입력",
  messagingSenderId: "여기에_MESSAGING_SENDER_ID_입력",
  appId: "여기에_APP_ID_입력"
}

// ... 나머지 코드는 그대로 유지
```

### 5단계: Firestore 보안 규칙 설정 (선택사항, 나중에 설정 가능)

현재는 테스트 모드로 시작했지만, 나중에 보안 규칙을 설정하는 것을 권장합니다:

1. Firestore Database > 규칙 탭
2. 기본 규칙 (모두 읽기/쓰기 가능)으로 시작
3. 나중에 인증 추가 후 보안 규칙 업데이트

### 6단계: 확인

1. 개발 서버 실행: `npm run dev`
2. 브라우저 콘솔(F12) 확인:
   - `✅ Firebase 초기화 완료` 메시지가 보이면 성공!
   - `⚠️ Firebase 설정이 완료되지 않았습니다.` 메시지가 보이면 설정을 다시 확인하세요.
3. 11월이나 12월로 이동하여 일정이 표시되는지 확인

## 초기 데이터 자동 로드

Firebase 연동이 완료되면, 앱을 처음 실행할 때 `src/data/initialSchedules.js`에 있는 11월과 12월 초기 일정 데이터가 자동으로 Firestore에 저장됩니다.

## 문제 해결

### Firebase 초기화 오류
- 설정 정보가 정확한지 확인
- Firebase 콘솔에서 프로젝트가 제대로 생성되었는지 확인
- 브라우저 콘솔의 오류 메시지 확인

### 데이터가 안 보일 때
- 브라우저 콘솔에서 Firebase 초기화 메시지 확인
- Firestore 콘솔에서 `schedules` 컬렉션이 생성되었는지 확인
- 네트워크 탭에서 Firebase 요청이 성공했는지 확인

## 참고

- Firebase 무료 플랜(Spark Plan)으로도 충분히 사용 가능합니다
- Firestore 무료 할당량: 일일 읽기 50,000회, 쓰기 20,000회
- 보안 규칙은 나중에 설정해도 됩니다 (개발 중에는 테스트 모드 사용 가능)

