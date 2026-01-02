# Firebase 웹 앱 설정 가이드

## 프로젝트 설정 찾기

### 방법 1: 설정 아이콘 사용 (권장)

1. Firebase 콘솔 왼쪽 상단의 **프로젝트 이름 옆 설정 아이콘(⚙️)** 클릭
2. 드롭다운 메뉴에서 **"프로젝트 설정"** 선택

### 방법 2: 직접 앱 추가

1. 프로젝트 개요 페이지에서 **"+ 앱 추가"** 버튼 클릭
2. 웹 아이콘 **`</>`** 선택

## 웹 앱 등록 단계

### 1단계: 웹 앱 등록

1. **"+ 앱 추가"** 버튼 또는 **프로젝트 설정 > 내 앱** 섹션으로 이동
2. **웹 아이콘 `</>`** 클릭
3. **앱 닉네임** 입력 (예: `monthly-schedule-web`)
4. **"앱 등록"** 버튼 클릭

### 2단계: Firebase SDK 설정 정보 복사

앱 등록 후 나타나는 **Firebase SDK 구성** 화면에서 다음 정보를 복사합니다:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "ysch-youthcalendar.firebaseapp.com",
  projectId: "ysch-youthcalendar",
  storageBucket: "ysch-youthcalendar.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};
```

### 3단계: 프로젝트에 설정 추가

1. 프로젝트 폴더의 `src/firebase/config.js` 파일 열기
2. 복사한 설정 정보로 교체:

```javascript
import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'

// Firebase 설정
const firebaseConfig = {
  apiKey: "여기에_복사한_API_KEY_붙여넣기",
  authDomain: "ysch-youthcalendar.firebaseapp.com",
  projectId: "ysch-youthcalendar",
  storageBucket: "ysch-youthcalendar.appspot.com",
  messagingSenderId: "복사한_MESSAGING_SENDER_ID",
  appId: "복사한_APP_ID"
}

// Firebase 설정 확인
export const isFirebaseConfigured = () => {
  return !firebaseConfig.apiKey.includes('YOUR_') && 
         !firebaseConfig.projectId.includes('YOUR_') &&
         firebaseConfig.apiKey !== "" &&
         firebaseConfig.projectId !== ""
}

// Firebase 초기화
let app = null
let db = null

try {
  if (isFirebaseConfigured()) {
    app = initializeApp(firebaseConfig)
    db = getFirestore(app)
    console.log('✅ Firebase 초기화 완료')
  } else {
    console.warn('⚠️ Firebase 설정이 완료되지 않았습니다.')
    console.warn('⚠️ src/firebase/config.js 파일에 Firebase 설정 정보를 입력해주세요.')
  }
} catch (error) {
  console.error('❌ Firebase 초기화 실패:', error)
}

export { db }
```

### 4단계: 확인

1. 파일 저장
2. 개발 서버 재시작 (이미 실행 중이면 브라우저 새로고침)
3. 브라우저 콘솔(F12)에서 확인:
   - ✅ `✅ Firebase 초기화 완료` 메시지 확인
   - ✅ 11월/12월 일정이 표시되는지 확인

## 참고

- 프로젝트 ID: `ysch-youthcalendar` (이미 생성된 프로젝트)
- authDomain과 storageBucket은 일반적으로 `프로젝트ID.firebaseapp.com`, `프로젝트ID.appspot.com` 형식입니다
- apiKey, messagingSenderId, appId는 Firebase 콘솔에서 정확히 복사한 값을 사용하세요

