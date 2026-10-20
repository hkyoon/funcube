// Firebase 설정을 여기에 붙여 넣으면 방 만들기·초대 기능이 켜집니다.
// Firebase 콘솔 → 프로젝트 설정 → 일반 → 내 앱(웹) → "SDK 설정 및 구성"의 firebaseConfig 값을 그대로 복사하세요.
// 이 값들은 공개되어도 괜찮은 값입니다. 데이터 보호는 firestore.rules의 보안 규칙이 맡습니다.
window.FIREBASE_CONFIG = null;
/* 예시:
window.FIREBASE_CONFIG = {
  apiKey: "AIza...",
  authDomain: "funcube-xxxx.firebaseapp.com",
  projectId: "funcube-xxxx",
  storageBucket: "funcube-xxxx.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abcdef"
};
*/

// 스폰서 조커: 조커 두 장 중 한 장에 광고주 로고를 넣고, 게임 결과 창에 "조커 제공" 문구를 띄웁니다.
// image에는 정사각형 로고 파일(저장소에 올린 파일 이름이나 https 주소)을 넣으세요. 끄려면 null로 바꾸세요.
// 로고: 비숑 얼굴(sponsor.svg). 실제 로고 파일을 받으면 이 파일만 바꾸세요.
window.SPONSOR = {
  name: "솜뭉치카페",
  image: "sponsor.svg",
  text: ""
};
