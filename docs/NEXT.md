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
  - 비공개 테스트 - Alpha: 버전 3이 **임시 저장** 상태, 국가 178개 설정됨, **테스터 목록 선택 안 됨**.
  - 게시 개요: **검토 제출 안 한 변경 13개**.
  - 참여 테스터 0명 (12명 × 14일 필요).
- 테스터 모집 글: `C:\dev\vocal-room-109\docs\testers\2026-11-23-모집글.txt`에 숨결을 함께 넣음 (`cb0648a`).

## 발견한 문제
- **딥 링크 도메인 검사 실패** (콘솔 경고 11-25). 원인: `assetlinks.json`은 도메인 맨 위(`https://logic-vc.github.io/.well-known/assetlinks.json`)에 있어야 하는데 `/breath-20/.well-known/` 아래에만 있다(맨 위는 404). 그리고 Play이 알려 준 현재 앱 서명 키 지문 `63:ED:A7:…:FE:F6`이 파일에 없다.
  - 영향 [추론]: 앱을 열면 맨 위에 브라우저 주소창이 보이는 "웹페이지 같은" 화면이 된다. 심사를 막는 문제는 아니다.
  - 해결: `logic-vc/logic-vc.github.io` 저장소(공개)를 만들어 맨 위에 `assetlinks.json`(기존 지문 2개 + 63:ED…)을 올린다. 공개 저장소를 만드는 일이라 사용자 확인이 필요하다.

## 다음 할 일
1. 테스터 목록 정하기 → Alpha 트랙에 연결 (기존 목록: 피치점프 테스터 22명, 피치라인 테스터 15명).
2. 도메인 맨 위 `assetlinks.json` 해결 (위 문제).
3. 변경 13개를 검토에 제출 → 승인 후 참여 링크를 테스터에게 보냄.
4. 실기기 테스트(마이크 민감도·진동·소리, 주소창 표시 여부).

## 사용자가 직접 할 일
- 키 비밀번호를 jerfkim 구글 비밀번호 관리자에 저장 (사이트 `play.google.com`, 사용자 이름 `숨결 업로드 키`, 비밀번호는 `C:\dev\sumgyeol_release\v3\extracted\signing-key-info.txt`). — 11-26 밤 예정
- 폰 확인 — 11-26 밤 예정.
- 모집 글의 `참여 선물`·`받을 곳` 채우고 보내기.
