-- =============================================================================
-- DO:NUTS seed.sql
-- Source: design-capture.md (Task 5) + schema 0001_schema.sql + 0003_programs.sql
-- Idempotent: deletes child-first, then re-inserts; singletons (online_league_settings, site_config) are UPDATEd only.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 0. Clean up (FK-safe order)
-- ---------------------------------------------------------------------------
delete from public.blind_structure_rows;
delete from public.events;
delete from public.special_pages;
delete from public.navigation_tabs;
delete from public.programs;
delete from public.blind_structures;
delete from public.seasons;


-- ---------------------------------------------------------------------------
-- 1. SEASONS — 1 active row (Spring 2026)
-- ---------------------------------------------------------------------------
insert into public.seasons (
  name, code, year,
  start_date, end_date,
  is_active,
  hero_text, sub_text, badge_text,
  theme_color,
  footer_sponsor_visible
) values (
  'DONUTS SERIES 2026 · SPRING SEASON',
  'spring',
  2026,
  '2026-05-16',
  '2026-07-19',
  true,
  'DONUTS SERIES 2026',
  '스프링 시즌과 함께하는 도너츠 포커 클럽의 공식 토너먼트 시리즈',
  'DONUTS SERIES 2026 · SPRING SEASON',
  '#FFE58A',
  true
);


-- ---------------------------------------------------------------------------
-- 2. BLIND STRUCTURES + ROWS
-- ---------------------------------------------------------------------------

-- 2-a. Template: 클래식 토너먼트
insert into public.blind_structures (name, is_template, event_type)
values ('클래식 토너먼트', true, 'NLH');

-- 2-b. Template: PLO 이벤트
insert into public.blind_structures (name, is_template, event_type)
values ('PLO 이벤트', true, 'PLO');


-- Rows for 클래식 토너먼트
insert into public.blind_structure_rows
  (structure_id, row_type, level_no, sb, bb, ante, duration, sort_order)
values
  ((select id from public.blind_structures where name='클래식 토너먼트' limit 1), 'level', 1,  '100',   '200',   '없음', 20, 1),
  ((select id from public.blind_structures where name='클래식 토너먼트' limit 1), 'level', 2,  '150',   '300',   '없음', 20, 2),
  ((select id from public.blind_structures where name='클래식 토너먼트' limit 1), 'level', 3,  '200',   '400',   '400',  20, 3),
  ((select id from public.blind_structures where name='클래식 토너먼트' limit 1), 'level', 4,  '300',   '600',   '600',  20, 4),
  ((select id from public.blind_structures where name='클래식 토너먼트' limit 1), 'break', null, null, null,  null,   null, 5),
  ((select id from public.blind_structures where name='클래식 토너먼트' limit 1), 'level', 5,  '400',   '800',   '800',  20, 6),
  ((select id from public.blind_structures where name='클래식 토너먼트' limit 1), 'level', 6,  '500',  '1000',  '1000', 20, 7),
  ((select id from public.blind_structures where name='클래식 토너먼트' limit 1), 'level', 7,  '600',  '1200',  '1200', 20, 8),
  ((select id from public.blind_structures where name='클래식 토너먼트' limit 1), 'level', 8,  '800',  '1600',  '1600', 20, 9),
  ((select id from public.blind_structures where name='클래식 토너먼트' limit 1), 'break', null, null, null, null,   null, 10),
  ((select id from public.blind_structures where name='클래식 토너먼트' limit 1), 'level', 9, '1000', '2000',  '2000', 20, 11),
  ((select id from public.blind_structures where name='클래식 토너먼트' limit 1), 'level', 10,'1500', '3000',  '3000', 20, 12),
  ((select id from public.blind_structures where name='클래식 토너먼트' limit 1), 'level', 11,'2000', '4000',  '4000', 20, 13),
  ((select id from public.blind_structures where name='클래식 토너먼트' limit 1), 'level', 12,'3000', '6000',  '6000', null, 14);

-- Update the break rows with proper break metadata
update public.blind_structure_rows
  set break_name = '휴식', break_minutes = 10
  where structure_id = (select id from public.blind_structures where name='클래식 토너먼트' limit 1)
    and row_type = 'break';


-- Rows for PLO 이벤트 (demonstrates text ante = "PLO")
insert into public.blind_structure_rows
  (structure_id, row_type, level_no, sb, bb, ante, duration, sort_order)
values
  ((select id from public.blind_structures where name='PLO 이벤트' limit 1), 'level', 1, '100',  '200',  'PLO',  20, 1),
  ((select id from public.blind_structures where name='PLO 이벤트' limit 1), 'level', 2, '150',  '300',  'PLO',  20, 2),
  ((select id from public.blind_structures where name='PLO 이벤트' limit 1), 'level', 3, '200',  '400',  'PLO',  20, 3),
  ((select id from public.blind_structures where name='PLO 이벤트' limit 1), 'break', null, null, null, null, null, 4),
  ((select id from public.blind_structures where name='PLO 이벤트' limit 1), 'level', 4, '300',  '600',  'PLO',  20, 5),
  ((select id from public.blind_structures where name='PLO 이벤트' limit 1), 'level', 5, '500', '1000',  'PLO',  20, 6),
  ((select id from public.blind_structures where name='PLO 이벤트' limit 1), 'level', 6, '750', '1500',  'PLO',  null, 7);

update public.blind_structure_rows
  set break_name = '휴식', break_minutes = 10
  where structure_id = (select id from public.blind_structures where name='PLO 이벤트' limit 1)
    and row_type = 'break';


-- ---------------------------------------------------------------------------
-- 3. EVENTS (tied to Spring 2026 season)
-- ---------------------------------------------------------------------------

-- 3-a. Festival
insert into public.events (
  season_id, title, event_type, round,
  date, weekday, location, address,
  start_time, reg_close_time,
  buy_in,
  category, status,
  is_visible, sort_order,
  blind_structure_id,
  description
) values (
  (select id from public.seasons where code='spring' and year=2026 limit 1),
  'DONUTS SERIES SPRING FESTIVAL 2026',
  'NLH',
  'MAIN EVENT',
  '2026-06-09',
  '화',
  'BPEX 부산 포커 엑스포',
  '부산광역시 해운대구',
  '12:00',
  '15:00',
  '200,000 Pt',
  'festival',
  'completed',
  true, 1,
  (select id from public.blind_structures where name='클래식 토너먼트' limit 1),
  '도너츠 시리즈 스프링 시즌 메인 페스티벌. 부산 BPEX에서 개최된 대규모 포커 토너먼트.'
);

-- 3-b. Confirmed event (with entry_link)
insert into public.events (
  season_id, title, event_type, round,
  date, weekday, location, address,
  start_time, reg_close_time,
  buy_in, entry_link, button_label,
  category, status,
  is_visible, sort_order,
  blind_structure_id,
  description
) values (
  (select id from public.seasons where code='spring' and year=2026 limit 1),
  'DONUTS SERIES 2026 — Round 5',
  'NLH',
  'Round 5',
  '2026-07-05',
  '일',
  '도너츠 포커클럽 서울',
  '서울특별시 강남구',
  '14:00',
  '16:00',
  '50,000 Pt',
  'https://forms.gle/6kBtHMZNZJLjn8up6',
  '참가하기',
  'confirmed',
  'confirmed',
  true, 5,
  (select id from public.blind_structures where name='클래식 토너먼트' limit 1),
  '도너츠 시리즈 스프링 시즌 5회차 확정 이벤트.'
);

-- 3-c. Upcoming event
insert into public.events (
  season_id, title, event_type, round,
  date, weekday, location, address,
  start_time,
  buy_in,
  category, status,
  is_visible, sort_order,
  description
) values (
  (select id from public.seasons where code='spring' and year=2026 limit 1),
  'DONUTS SERIES 2026 — Round 6',
  'NLH',
  'Round 6',
  '2026-07-19',
  '일',
  '도너츠 포커클럽 서울',
  '서울특별시',
  '14:00',
  '50,000 Pt',
  'upcoming',
  'scheduled',
  true, 6,
  '도너츠 시리즈 스프링 시즌 최종 라운드.'
);

-- 3-d. Completed event
insert into public.events (
  season_id, title, event_type, round,
  date, weekday, location, address,
  start_time,
  buy_in,
  category, status,
  is_visible, sort_order,
  blind_structure_id,
  description
) values (
  (select id from public.seasons where code='spring' and year=2026 limit 1),
  'DONUTS SERIES 2026 — Round 1',
  'NLH',
  'Round 1',
  '2026-05-18',
  '일',
  '도너츠 포커클럽 서울',
  '서울특별시 강남구',
  '14:00',
  '50,000 Pt',
  'completed',
  'completed',
  true, 10,
  (select id from public.blind_structures where name='클래식 토너먼트' limit 1),
  '도너츠 시리즈 스프링 시즌 1회차 — 완료.'
);

-- 3-e. Super Cup Challenge satellite (양재)
insert into public.events (
  season_id, title, event_type, round,
  date, weekday, location, address,
  start_time,
  buy_in, entry_link, button_label,
  category, status,
  is_visible, sort_order,
  description
) values (
  (select id from public.seasons where code='spring' and year=2026 limit 1),
  'SUPER CUP CHALLENGE — 새틀라이트',
  'NLH',
  'Satellite',
  '2026-06-07',
  '일',
  '양재빌딩 5F',
  '서울특별시 서초구 양재동',
  '13:00',
  '₩50,000',
  'https://forms.gle/6kBtHMZNZJLjn8up6',
  '참가하기',
  'confirmed',
  'completed',
  true, 20,
  '슈퍼컵 챌린지 진출권을 건 새틀라이트 토너먼트. 양재빌딩 5층.'
);


-- ---------------------------------------------------------------------------
-- 4. NAVIGATION TABS (directory category tabs)
-- ---------------------------------------------------------------------------
insert into public.navigation_tabs
  (name, key, type, slug, is_visible, sort_order, mobile_visible,
   home_card_visible, home_card_title, home_card_desc, home_card_cta)
values
  ('포커 프로그램', 'poker',  'internal', '/poker',  true, 1, true,
   true, '포커 프로그램', '모든 포커 토너먼트 & 모임', '모두 보기'),
  ('소셜 프로그램', 'social', 'internal', '/social', true, 2, true,
   true, '소셜 프로그램', '보드게임·소셜 전략 모임', '모두 보기'),
  ('기타 프로그램', 'others', 'internal', '/others', true, 3, true,
   false, null, null, null);


-- ---------------------------------------------------------------------------
-- 5. PROGRAMS (directory — from §4 page inventory)
-- ---------------------------------------------------------------------------

-- 5-a. 도너츠 시리즈 (is_hot, external_url='/series')
insert into public.programs (
  slug, title, category, program_group, status,
  member_count, location,
  manager_name, manager_role,
  cta_label, external_url,
  is_hot, is_affiliate, is_visible,
  sort_order, description
) values (
  'series',
  '도너츠 시리즈',
  '포커 대회',
  'poker',
  '모집 중',
  75,
  '서울/부산',
  '이종한', '담당자',
  '상세 정보',
  '/series',
  true, false, true,
  1,
  '도너츠 포커 클럽의 공식 시즌제 토너먼트 시리즈. 스프링·서머·오텀·윈터 시즌별로 진행.'
);

-- 5-b. 도너츠 홀덤연구소
insert into public.programs (
  slug, title, category, program_group, status,
  member_count, location,
  manager_name, manager_role,
  cta_label,
  is_hot, is_affiliate, is_visible,
  sort_order, description
) values (
  'donutslab',
  '도너츠 홀덤연구소',
  '커뮤니티',
  'poker',
  '모집 중',
  0,
  '온라인',
  '담당자', '담당자',
  '바로가기(코드 7777)',
  false, false, true,
  2,
  '홀덤 전략 연구 및 스터디 커뮤니티. 코드 7777로 참여.'
);

-- 5-c. WPL 홀덤 마스터스
insert into public.programs (
  slug, title, category, program_group, status,
  member_count, location,
  manager_name, manager_role,
  cta_label,
  is_hot, is_affiliate, is_visible,
  sort_order, description
) values (
  'wpl-홀덤-마스터스',
  'WPL 홀덤 마스터스',
  '포커 대회',
  'poker',
  '모집 중',
  0,
  '서울',
  '담당자', '담당자',
  '신청 및 문의',
  false, false, true,
  3,
  'WPL 주관 홀덤 마스터스 대회.'
);

-- 5-d. 외대 주간 (donuts-seoul-east)
insert into public.programs (
  slug, title, category, program_group, status,
  member_count, location,
  manager_name, manager_role,
  cta_label,
  is_hot, is_affiliate, is_visible,
  sort_order, description
) values (
  'donuts-seoul-east',
  '외대 주간 포커 모임',
  '포커 모임',
  'poker',
  '모집 중',
  0,
  '서울 동대문구',
  '호스트', '호스트',
  '신청 및 문의',
  false, false, true,
  4,
  '외국어대학교 인근 주간 포커 모임.'
);

-- 5-e. 소셜전략게임
insert into public.programs (
  slug, title, category, program_group, status,
  member_count, location,
  manager_name, manager_role,
  cta_label,
  is_hot, is_affiliate, is_visible,
  sort_order, description
) values (
  'donuts-socialstrategygame',
  '소셜전략게임',
  '소셜전략게임',
  'social',
  '모집 중',
  0,
  '서울',
  '담당자', '담당자',
  '신청 및 문의',
  false, false, true,
  10,
  '보드게임·소셜 전략 게임 중심 모임.'
);

-- 5-f. 문래 동호회 원페어
insert into public.programs (
  slug, title, category, program_group, status,
  member_count, location,
  manager_name, manager_role,
  cta_label,
  is_hot, is_affiliate, is_visible,
  sort_order, description
) values (
  '문래-동호회-원페어',
  '문래 동호회 원페어',
  '포커 모임',
  'poker',
  '모집 중',
  0,
  '서울 영등포구 문래동',
  '담당자', '담당자',
  '신청 및 문의',
  false, false, true,
  5,
  '문래동 지역 포커 동호회.'
);

-- 5-g. 서울대 동아리 ATC
insert into public.programs (
  slug, title, category, program_group, status,
  member_count, location,
  manager_name, manager_role,
  cta_label,
  is_hot, is_affiliate, is_visible,
  sort_order, description
) values (
  '서울대-동아리-atc',
  '서울대 동아리 ATC',
  '포커 모임',
  'poker',
  '모집 중',
  0,
  '서울 관악구',
  '담당자', '담당자',
  '신청 및 문의',
  false, false, true,
  6,
  '서울대학교 포커 동아리 ATC.'
);

-- 5-h. 부산 동호회 부.울.경
insert into public.programs (
  slug, title, category, program_group, status,
  member_count, location,
  manager_name, manager_role,
  cta_label,
  is_hot, is_affiliate, is_visible,
  sort_order, description
) values (
  '부산-동호회-부.울.경',
  '부산 동호회 부.울.경',
  '포커 모임',
  'poker',
  '모집 중',
  0,
  '부산·울산·경남',
  '담당자', '담당자',
  '신청 및 문의',
  false, false, true,
  7,
  '부산·울산·경남 지역 포커 동호회.'
);

-- 5-i. 신림 동호회 에어라인
insert into public.programs (
  slug, title, category, program_group, status,
  member_count, location,
  manager_name, manager_role,
  cta_label,
  is_hot, is_affiliate, is_visible,
  sort_order, description
) values (
  '신림-동호회-에어라인',
  '신림 동호회 에어라인',
  '포커 모임',
  'poker',
  '모집 중',
  0,
  '서울 관악구 신림동',
  '담당자', '담당자',
  '신청 및 문의',
  false, false, true,
  8,
  '신림동 지역 포커 동호회.'
);

-- 5-j. 도너츠 포커 클래스 26-1기 (모집 완료)
insert into public.programs (
  slug, title, category, program_group, status,
  member_count, location,
  manager_name, manager_role,
  cta_label,
  is_hot, is_affiliate, is_visible,
  sort_order, description
) values (
  '도너츠-포커-클래스-26-1기',
  '도너츠 포커 클래스 26-1기',
  '포커 모임',
  'poker',
  '모집 완료',
  0,
  '서울',
  '호스트', '호스트',
  '신청 및 문의',
  false, false, true,
  9,
  '도너츠 포커 클래스 2026년 1기. 모집이 완료되었습니다.'
);

-- 5-k. 도너츠 서울 GG데이
insert into public.programs (
  slug, title, category, program_group, status,
  member_count, location,
  manager_name, manager_role,
  cta_label,
  is_hot, is_affiliate, is_visible,
  sort_order, description
) values (
  '도너츠-서울-gg데이',
  '도너츠 서울 GG데이',
  '포커 모임',
  'poker',
  '모집 중',
  0,
  '서울',
  '호스트', '호스트',
  '신청 및 문의',
  false, false, true,
  11,
  '서울 지역 GG데이 포커 모임.'
);

-- 5-l. 도너츠 신림 홀덤 세션
insert into public.programs (
  slug, title, category, program_group, status,
  member_count, location,
  manager_name, manager_role,
  cta_label,
  is_hot, is_affiliate, is_visible,
  sort_order, description
) values (
  '도너츠-신림-홀덤-세션',
  '도너츠 신림 홀덤 세션',
  '포커 모임',
  'poker',
  '모집 중',
  0,
  '서울 관악구 신림동',
  '호스트', '호스트',
  '신청 및 문의',
  false, false, true,
  12,
  '신림 지역 홀덤 정기 세션.'
);

-- 5-m. Affiliate: 포커루루
insert into public.programs (
  slug, title, category, program_group, status,
  member_count,
  cta_label, external_url,
  is_hot, is_affiliate, is_visible,
  sort_order, description
) values (
  '포커루루',
  '포커루루',
  null,
  'others',
  null,
  0,
  '바로가기',
  '#',
  false, true, true,
  20,
  '도너츠 제휴 파트너 — 포커루루.'
);

-- 5-n. Affiliate: 맥스홀덤 라운지
insert into public.programs (
  slug, title, category, program_group, status,
  member_count,
  cta_label, external_url,
  is_hot, is_affiliate, is_visible,
  sort_order, description
) values (
  '맥스홀덤-라운지',
  '맥스홀덤 라운지',
  null,
  'others',
  null,
  0,
  '바로가기',
  '#',
  false, true, true,
  21,
  '도너츠 제휴 파트너 — 맥스홀덤 라운지.'
);

-- 5-o. Affiliate: DO:LAB
insert into public.programs (
  slug, title, category, program_group, status,
  member_count,
  cta_label, external_url,
  is_hot, is_affiliate, is_visible,
  sort_order, description
) values (
  'do-lab',
  'DO:LAB',
  null,
  'others',
  null,
  0,
  '바로가기',
  '/lab',
  false, true, true,
  22,
  '도너츠 제휴 파트너 — DO:LAB 홀덤연구소 허브.'
);


-- ---------------------------------------------------------------------------
-- 6. SPECIAL PAGES — challenge
-- ---------------------------------------------------------------------------
insert into public.special_pages (
  slug, label, title, description,
  date, venue, address, start_time,
  entry_link, cta_label,
  info_cards,
  note_list,
  gallery,
  is_visible,
  blind_structure_id
) values (
  'challenge',
  '챌린지 이벤트',
  'SUPER CUP CHALLENGE',
  '도너츠 시리즈 스프링 2026 챌린지 이벤트. 양재 새틀라이트를 통해 본선(부산 BPEX) 진출권을 획득하세요.',
  '2026-06-09',
  'BPEX 부산 포커 엑스포',
  '부산광역시 해운대구',
  '12:00',
  'https://forms.gle/6kBtHMZNZJLjn8up6',
  '이벤트 참가하기',
  '[
    {"label": "DATE", "value": "2026-06-09 (화) 12:00"},
    {"label": "VENUE", "value": "BPEX 부산 포커 엑스포, 부산광역시 해운대구"},
    {"label": "BUY-IN", "value": "200,000 Pt (메인) / ₩50,000 (새틀라이트)"},
    {"label": "SATELLITE", "value": "2026-06-07 (일) · 양재빌딩 5F"},
    {"label": "FORMAT", "value": "No-Limit Hold''em · Starting Stack 50,000"}
  ]'::jsonb,
  '[
    "본선 진출은 새틀라이트 우승 또는 도너츠 시리즈 포인트 상위자에게 주어집니다.",
    "새틀라이트 Buy-in: ₩50,000 (현금 표기, 시리즈 본선은 포인트)",
    "자세한 규정은 참가하기 버튼을 통해 확인하세요."
  ]'::jsonb,
  '[]'::jsonb,
  true,
  (select id from public.blind_structures where name='클래식 토너먼트' limit 1)
);


-- ---------------------------------------------------------------------------
-- 7. ONLINE LEAGUE SETTINGS (singleton id=1 — UPDATE only)
-- ---------------------------------------------------------------------------
update public.online_league_settings
set
  status       = 'revamping',
  tab_visible  = true,
  title        = '온라인 리그',
  description  = '도너츠 포커 클럽의 온라인 홀덤 리그',
  notice_text  = '온라인 리그 개편중',
  cta_label    = '온라인 리그 문의하기',
  cta_url      = 'https://forms.gle/6kBtHMZNZJLjn8up6',
  steps        = '[]'::jsonb,
  links        = '{}'::jsonb,
  today_leagues= '[]'::jsonb,
  updated_at   = now()
where id = 1;


-- ---------------------------------------------------------------------------
-- 8. SITE CONFIG (singleton id=1 — UPDATE only)
-- ---------------------------------------------------------------------------
update public.site_config
set
  signup_visible              = true,
  signup_link                 = 'https://forms.gle/6kBtHMZNZJLjn8up6',
  signup_new_tab              = true,
  signup_button_label         = '가입 신청하기',
  signup_closed               = false,
  leaderboard_tab_visible     = true,
  leaderboard_personal_rank_visible = true,
  footer_sponsors             = '[
    {"name": "SUPER CUP",  "logo": null, "url": "#"},
    {"name": "POKER LAB",  "logo": null, "url": "#"},
    {"name": "Moitto",     "logo": null, "url": "#"}
  ]'::jsonb,
  updated_at = now()
where id = 1;
