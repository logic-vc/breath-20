# 출시 가이드 — 숨결

> 현재 상태: 앱 코드는 정적 파일만으로 동작(서버·API 키 없음). **공개 주소(HTTPS)만 있으면 웹앱으로 즉시 출시 가능.**
> 스토어 출시는 개발자 계정·본인 인증·심사가 필요해서 아래 "사용자가 해야 할 일"이 있다.

## 0. 이름
- 한국: **숨결** (확정)
- 해외: **미정.** `Breath Flow`는 비추천 — 같은 이름/유사 이름의 호흡 앱이 다수(BreathFlow, Breathe Flow, Breathing Flow 등)이고 BREATHFLOW 상표 출원(미국, 클래스 9·42·44)이 확인됨.
- 후보: `Breath Tide` (정확히 같은 앱/상표는 검색에서 못 찾음. 단, 호흡·명상 앱 `TIDE`가 있어 혼동 가능성 → 부제를 붙여 구분).
- 확정 전 필수: 앱스토어/플레이스토어 직접 검색, USPTO·KIPRIS 상표 조회, 도메인·SNS 계정명 확인.

## 1. 웹앱(PWA) 출시 — 가장 빠름
요건: HTTPS (마이크와 서비스 워커가 HTTPS에서만 동작).
1. 정적 호스팅에 저장소 루트를 그대로 배포 (Netlify / Cloudflare Pages / Vercel / GitHub Pages). 빌드 불필요.
2. 배포 후 확인: 홈 화면에 추가(설치) 가능, 비행기 모드에서 실행, 훈련 탭에서 마이크 권한 요청.
3. `privacy.html`이 공개 주소에서 열리는지 확인(스토어 심사에서 URL로 필요).

## 2. Android (Google Play) — TWA
```bash
npm i -g @bubblewrap/cli
bubblewrap init --manifest https://<도메인>/manifest.webmanifest
bubblewrap build        # .aab 생성
```
- 도메인에 `/.well-known/assetlinks.json` 배치(Bubblewrap이 안내하는 값).
- Play Console: 개발자 등록(일회성 수수료), 앱 서명, 콘텐츠 등급, **데이터 보안 양식 = "수집하는 데이터 없음"**, 개인정보 처리방침 URL.
- 신규 개인 계정은 비공개 테스트 요건이 있을 수 있음 → 콘솔 안내 확인.

## 3. iOS (App Store) — Capacitor
- Apple Developer Program(연회비) 필요. 웹을 그대로 감싼 앱은 **심사 4.2(최소 기능)에서 거절될 위험**이 있어 네이티브 기능을 같이 넣는 것을 권장:
  - 햅틱(iOS는 웹 진동 미지원), 로컬 알림(연습 리마인더), HealthKit 마인드풀 시간 기록
- 필수 문구(Info.plist): `NSMicrophoneUsageDescription` — "훈련에서 숨소리의 세기를 분석합니다. 소리는 녹음·저장·전송되지 않습니다."
- App Privacy: "데이터 수집 안 함". 심사 노트에 "의료 기기가 아니며 질병 진단·치료를 주장하지 않음" 명시.

## 4. 스토어 문구 초안
**한국어**
- 이름: `숨결: 호흡 훈련·롱톤`
- 부제: `복식호흡·보컬 호흡·폐활량 트레이너`
- 설명: 눈을 감고 소리만 따라가도 되는 느린 호흡(20·3·20) 트레이너. 숨소리로 세기를 가늠하는 마이크 훈련(공 띄우기, 일정하게 마시기), 마음 변화 기록, 계정 없이 오프라인으로.

**English** (이름 확정 후 교체)
- Name: `<Final name>: Breath Trainer`
- Subtitle: `Singing Breath Control & Lungs`
- Description: A slow-breathing trainer you can follow with your eyes closed (20·3·20). Microphone training that senses the strength of your breath (ball lift, steady inhale), mood tracking, no account, works offline.

**주의**: 의료 효능(치료, 불안 장애 개선 등)을 주장하는 문구는 쓰지 않는다. 마이크 훈련은 "숨소리의 세기를 소리로 가늠"한다고 정직하게 표기(실제 호흡량 측정 아님).

## 5. 출시 전 체크리스트
- [ ] 영어 이름 확정 + 중복/상표 확인
- [ ] 문의 이메일을 `privacy.html`에 입력(현재 자리표시자)
- [ ] 개인정보 처리방침 법률 검토 (초안임)
- [ ] 실기기 테스트: iOS Safari, Android Chrome — 소리·진동·마이크 민감도(임계값 조정 필요할 수 있음)
- [ ] 스토어용 아이콘(1024px), 스크린샷(docs/screenshots-*) 교체·재촬영
- [ ] 개발자 계정(Apple/Google), 도메인
