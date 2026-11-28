# 숨결 — 상태 / 다음 할 일

> 2026-11-26 점검. 11-21~22 작업 대화 기록이 남아 있지 않아서 저장소·릴리스 폴더·공개 사이트·Play Console을 직접 보고 재구성했다.

## 어디까지 했나 (직접 확인)
- 웹앱 v2.4 + 웃는 얼굴 + 공 세 개 아이콘 (`3b5bc01`, 11-22). push 완료.
- 공개 사이트: https://logic-vc.github.io/breath-20/ (GitHub Pages, 저장소 **공개**). `privacy.html` 열림.
- 안드로이드 빌드(PWABuilder, TWA): `C:\dev\sumgyeol_release\` — `v3`가 최신(버전 코드 3, 1.0.0.2). 패키지 `com.vocallogic.sumgyeol`.
- **서명 키 백업 완료 (11-26)**: `C:\dev\keys\sumgyeol_upload.keystore` + `G:\내 드라이브\앱 서명키 백업\sumgyeol_upload.keystore` (해시 일치).
- **Play Console** (logicmentorlab, 개발자 계정 VOCAL LOGIC, 앱 ID 4976316463655534355), 11-26 확인:
  - 앱 이름 `숨결: 호흡 훈련 · 폐활량 · 호흡 타이머`, 카테고리 건강/운동, 18세 이상, 방침 URL 등록됨.
  - 내부 테스트: 버전 3 (1.0.0.2) 게시됨(11-22), 검토 안 받음.
  - 비공개 테스트 - Alpha: 버전 3 출시 준비 저장됨, 국가 178개, 테스터 목록 **`숨결 테스터`**(11-26 새로 만듦, 지금은 logicmentorlab 1명) 연결됨.
  - 게시 개요: **11-29 검토 제출 완료 (사용자 지시)** — 변경 16개, Alpha 트랙은 **버전 4 (1.0.0.3)**. 제출 전 Play 자동 검사 통과. 상태 "검토 중인 변경사항", 보통 7일 이내.
  - 참여 링크(웹): https://play.google.com/apps/testing/com.vocallogic.sumgyeol
  - 참여 테스터 0명 (12명 × 14일 필요). 스토어 기본 언어가 en-US로 잡혀 있음(내용은 한국어) — [미검증] 문제 될지 모름.
- 테스터 모집 글: `C:\dev\vocal-room-109\docs\testers\2026-11-23-모집글.txt`에 숨결을 함께 넣음 (`cb0648a`).

## 사용자 피드백 6가지 (11-26, 폰에서 써 본 뒤) — 진행 상황
1. ✅ 30·3·30, 40·3·40 추가 → Lv.1~Lv.6 (`19b48f9`)
2. ✅ 배경음악 교체 (`5422261`) — 사용자가 Suno에서 받은 3곡(원본 `bgm.mp3`·`bgm1.mp3`·`bgm2.mp3`, git 제외)을 무음 제거·음량 통일·128k로 다듬어 `bgm/track1~3.mp3`. 설정에서 1·2·3·끔 선택. **폰에서 소리 확인은 사용자 몫**(끊김·깨짐·신호음과의 크기 균형). Suno 구독은 끝남 — 구독 중 만든 곡의 앱 사용 권리는 [미검증], 약관 확인 필요
3. ✅ 훈련 방법 안내(그림 3줄) + 연습 1회 (`2072a8d`)
4. ✅ 일정하게 마시기에 폐 게이지 (`2072a8d`)
5. ✅ 훈련 톤 문구. 마음 체크인 → 끝난 뒤 난이도 체크(쉬웠다/적당했다/힘들었다) (`19b48f9`)
6. ✅ 글자 줄이고 그림으로 (11-27, v2.7) — 홈: 인사말·설명·팁 삭제, 큰 `Lv.N` + 마시기/멈춤/내쉬기 세 칸(화살표+초), 버튼 `시작 42초`, 단계는 숫자 1~6 한 줄, 반복 4칸. 스크롤 없이 한 화면. 호흡 화면 용어도 `마시기·멈춤·내쉬기`, `Lv.1 · 1 / 3`으로 통일. **폰에서 보는 것은 사용자 몫**
- 추가 제안(사용자에게 알림, 반대 없음): 기록 탭 최고 단계 ✅ / 음악 끄고 신호음만 듣기 ⬜(2번과 함께)
- 레퍼런스 조사 요약(11-26): 훈련 앱은 "측정→기록→단계 추천", 화면은 단계명·남은 초·n/N만, 결과는 최고 기록 하나. 스크린샷은 확인 못 함(텍스트 설명 기준)
- 화면 확인용: `_t.html`(git 제외) + `python -m http.server 8765` + `node ~/.claude/tools/shot.mjs`

## 아이콘·색 통일 (11-29, v2.8)
- 사용자 결정: 그림(통 3개 + 공 3개)은 그대로, **밝은 쪽으로 통일**. 흰 배경 + 남색으로 꽉 찬 통 + 선명한 공 (`icon-drafts/2026-11-29-light/light-B.png` → `final-1024.png`). 다른 시안(캐릭터·바람·링 등)은 `icon-drafts/2026-11-29*` 폴더에 보관, 채택 안 함.
- 웹 반영 완료: `icons/` 전부 교체(maskable은 그림 58%로 원형 안전), 앱 안 마크(왼쪽 위·환영·완료 화면)도 같은 그림 `icons/mark.png`, manifest 배경·테마 `#FFFFFF`, 이름 `숨결 — 호흡 훈련`.
- **버전 4 (versionCode 4, 1.0.0.3) 빌드·제출 완료 (11-29)**: 새 아이콘 + 여는 화면 흰색. 산출물 `C:\dev\sumgyeol_release\v4\sumgyeol-v4.aab`·`.apk` (업로드 키 서명, SHA-256 1C:50… 확인). Play 스토어 등록 아이콘도 `icon-512-light-noalpha.png`로 교체.
  - **다음 버전 만드는 법 (PWABuilder 사이트 없이 로컬)**: `v4\project\twa-manifest.json`의 `appVersionCode`·`appVersionName`을 올림 → `node gen.cjs <@bubblewrap/core가 깔린 node_modules 경로>` (프로젝트 생성) → `project`에서 `JAVA_HOME=C:/devtools/jdk-21.0.12.1+1 ANDROID_HOME=C:/devtools/android-sdk GRADLE_USER_HOME=C:/devtools/gradle-home ./gradlew.bat --no-daemon bundleRelease assembleRelease` → `python sign.py` (키 정보 파일에서 비밀번호를 읽어 환경변수로만 넘김, 출력 안 함). Bubblewrap CLI는 JDK 17만 받아서 CLI 대신 core만 쓴다. Play 업로드는 화면의 "업로드"가 처리 중에서 안 넘어가면 새로 고친 뒤 "라이브러리에서 추가".
  - 실기기 확인은 못 함(폰 미연결). 폰에 깔린 v3는 업로드 키 서명본이라 `adb install -r sumgyeol-v4.apk`로 덮어쓸 수 있다.
  - 스토어 스크린샷·그래픽 이미지는 옛 화면(v2.4, 남색 아이콘) 그대로다 — 교체 안 함.

## 발견한 문제
- **딥 링크 도메인 검사 실패** (콘솔 경고 11-25). 원인: `assetlinks.json`은 도메인 맨 위(`https://logic-vc.github.io/.well-known/assetlinks.json`)에 있어야 하는데 `/breath-20/.well-known/` 아래에만 있다(맨 위는 404). 그리고 Play이 알려 준 현재 앱 서명 키 지문 `63:ED:A7:…:FE:F6`이 파일에 없다.
  - 영향 [추론]: 앱을 열면 맨 위에 브라우저 주소창이 보이는 "웹페이지 같은" 화면이 된다. 심사를 막는 문제는 아니다.
  - **해결함 (11-26, 사용자 승인)**: 공개 저장소 `logic-vc/logic-vc.github.io`(로컬 `C:\dev\logic-vc-site`)에 `assetlinks.json`(63:ED… + 기존 2개)을 올림. 구글 Digital Asset Links API가 읽는 것까지 확인. 콘솔 경고가 사라지는지는 [미검증] — 콘솔이 다시 검사해야 함. 폰에서 주소창이 안 보이면 해결된 것.

## 다음 할 일
1. Play 검토 결과 기다림(11-29 제출) → 승인되면 참여 링크를 테스터에게 보냄(사용자 확인 후).
2. 모집으로 받은 지메일을 Play Console > 비공개 테스트 > 테스터 > `숨결 테스터` 목록에 추가 (Vocal Room 109 목록에도 같이).
3. 실기기 테스트(마이크 민감도·진동·소리, 주소창 표시 여부).

## 사용자가 직접 할 일
- ~~키 비밀번호 저장~~ — 11-26 완료 (jerfkim 구글 비밀번호 관리자, `play.google.com` / `숨결 업로드 키`)
- 폰 확인 — 11-26 밤 예정.
- 모집 글의 `참여 선물`·`받을 곳` 채우고 보내기.
