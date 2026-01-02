# Firebase 자동 배포 설정 가이드

## 1. Firebase 토큰 생성

터미널에서 다음 명령어를 실행하여 Firebase 토큰을 생성하세요:

```bash
firebase login:ci
```

이 명령어를 실행하면 브라우저가 열리고 Google 계정으로 로그인하라는 메시지가 나타납니다. 로그인 후 터미널에 토큰이 표시됩니다.

**예시 출력:**
```
✔  Success! Use this token to authenticate on CI servers:

1//xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

Example: firebase deploy --token "$FIREBASE_TOKEN"
```

## 2. GitHub Secrets에 토큰 추가

1. GitHub 저장소 페이지로 이동: https://github.com/jadu329-cmd/ysch-adultcalendar
2. **Settings** 탭 클릭
3. 왼쪽 메뉴에서 **Secrets and variables** > **Actions** 클릭
4. **New repository secret** 버튼 클릭
5. 다음 정보 입력:
   - **Name**: `FIREBASE_TOKEN`
   - **Secret**: 위에서 생성한 Firebase 토큰을 붙여넣기
6. **Add secret** 버튼 클릭

## 3. 코드 푸시

변경사항을 커밋하고 푸시하면 자동으로 배포됩니다:

```bash
git add .
git commit -m "Update calendar features"
git push origin main
```

## 4. 배포 확인

1. GitHub 저장소의 **Actions** 탭에서 배포 진행 상황을 확인할 수 있습니다.
2. 배포가 완료되면 Firebase Hosting URL에서 사이트를 확인할 수 있습니다.

## 참고사항

- `main` 브랜치에 푸시할 때만 자동 배포가 실행됩니다.
- 배포는 약 2-3분 정도 소요됩니다.
- 배포 실패 시 GitHub Actions 탭에서 로그를 확인할 수 있습니다.

