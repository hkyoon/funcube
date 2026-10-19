# 루미큐브

브라우저에서 하는 루미큐브 웹 게임입니다. **https://hkyoon.github.io/funcube/**

- 혼자 연습: 컴퓨터 1~3명과 대전 (진행 상황은 브라우저에 저장)
- 방 만들기 / 초대: 4자리 방 코드와 초대 링크로 최대 4명이 함께 플레이, 빈 자리는 컴퓨터로 채움
- 규칙: 그룹·런 자동 판정, 조커, 첫 등록 30점, 테이블 재배치

## 온라인 방 기능 켜기 (Firebase, 무료)

1. https://console.firebase.google.com 에서 프로젝트를 만듭니다 (Google 애널리틱스는 꺼도 됩니다).
2. **Authentication → 시작하기 → Sign-in method → 익명(Anonymous)** 을 사용 설정합니다.
3. **Firestore Database → 데이터베이스 만들기** (위치는 `asia-northeast3 (서울)` 추천, 프로덕션 모드).
4. Firestore의 **규칙** 탭에 이 저장소의 `firestore.rules` 내용을 붙여 넣고 **게시**합니다.
5. **프로젝트 설정(톱니바퀴) → 일반 → 내 앱 → 웹(`</>`)** 으로 앱을 등록하고, 나오는 `firebaseConfig` 값을 `config.js`에 붙여 넣습니다.
6. **Authentication → 설정 → 승인된 도메인**에 `hkyoon.github.io`를 추가합니다.

`config.js`가 비어 있으면 혼자 연습하기만 동작합니다.

## 파일

- `index.html` — 게임 전체
- `config.js` — Firebase 설정
- `firestore.rules` — Firestore 보안 규칙
