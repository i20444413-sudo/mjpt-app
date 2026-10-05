# 이민준 PT 앱

Supabase에 연결된 Android/iOS용 Expo 앱 초안입니다.

## 현재 포함
- 회원/관리자 이메일 로그인
- 관리자/회원 역할에 따른 화면 분기
- 회원 홈: 다음 PT, 잔여 PT, 헬스 이용기간
- 예약 목록
- 운동기록/댓글 조회
- 인바디 기록 조회
- 관리자: 회원 목록, 예약 등록, PT 증감, 인바디 입력, 운동기록 작성
- Supabase 연결

## 실행
1. Node.js LTS 설치
2. 이 폴더에서 터미널 실행
3. `npm install`
4. `npx expo start`
5. Android에서는 Expo Go로 QR 스캔

처음 테스트는 이메일/비밀번호 로그인 기준입니다. 전화번호 SMS 인증은 Supabase SMS 제공업체 설정 후 추가합니다.

## 중요
`.env`에는 Supabase Publishable Key만 넣었습니다. service_role/secret key는 앱에 넣으면 안 됩니다.

실서비스 전에는 RLS 정책, Storage 정책, 푸시 알림, 예약 자동 차감 스케줄러, 앱스토어/플레이스토어 빌드를 추가해야 합니다.
