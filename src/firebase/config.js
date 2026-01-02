import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'

// Firebase 설정
const firebaseConfig = {
  apiKey: "AIzaSyCzhvUC0756UQMv0fnBoU4IMORU6XqbeGw",
  authDomain: "ysch-youthcalendar.firebaseapp.com",
  projectId: "ysch-youthcalendar",
  storageBucket: "ysch-youthcalendar.firebasestorage.app",
  messagingSenderId: "399051904988",
  appId: "1:399051904988:web:c92bcd6d92370683e2a119"
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

