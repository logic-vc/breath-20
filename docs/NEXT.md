# 숨결 — 상태 / 다음 할 일

> 2026-11-26 점검. 11-21~22 작업 대화 기록이 남아 있지 않아서 저장소·릴리스 폴더·공개 사이트를 직접 보고 재구성했다.

## 어디까지 했나 (직접 확인)
- 웹앱 v2.4 + 웃는 얼굴 + 공 세 개 아이콘 (`3b5bc01`, 11-22). push 완료.
- 공개 사이트: https://logic-vc.github.io/breath-20/ (GitHub Pages, 저장소 **공개**). `privacy.html` 열림(200), `/.well-known/assetlinks.json` 올라가 있음.
- 안드로이드 빌드(PWABuilder, TWA): `C:\dev\sumgyeol_release\` — `extracted`(1차) · `v2` · `v3`(가장 최근, 11-22 09:39). 패키지 `com.vocallogic.sumgyeol`. 세 빌드 모두 **같은 서명 키**.
- 출시 가이드: `docs/RELEASE.md`.

## 확인 못 한 것
- [미검증] Play Console에 앱을 만들었는지, AAB를 비공개 테스트 트랙에 올렸는지, 테스터 모집을 어디까지 했는지.
- [미검증] 영어 이름(후보 `Breath Tide`) 확정 여부.

## 다음 할 일
1. **서명 키 백업** — `sumgyeol_release\*\signing.keystore`가 이 PC에만 있다. 잃으면 앱 업데이트가 막힌다. 다른 앱처럼 `C:\dev\keys\`와 `G:\내 드라이브\앱 서명키 백업\`에 두고, `signing-key-info.txt`의 비밀번호는 jerfkim 구글 비밀번호 관리자에 넣는다.
2. Play Console(logicmentorlab) 상태 확인 → 비공개 테스트 트랙에 v3 AAB 업로드.
3. 테스터 12명 × 14일. vocal-room-109 모집 글(`C:\dev\vocal-room-109\docs\testers\2026-11-23-모집글.txt`)과 같은 12명으로 묶어 모집 가능(공식 도움말상 막는 문구 없음, 11-22 확인). 앱마다 피드백을 따로 기록.
4. 실기기 테스트(마이크 민감도·진동·소리).

## 사용자가 직접 할 일
- 키 비밀번호를 비밀번호 관리자에 저장 (사이트 `play.google.com`, 사용자 이름 `숨결 업로드 키`).
- 테스터에게 모집 글 보내기.
