-- Multiverse Me: Initial Schema

-- 결과 저장 테이블
create table public.results (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  score int not null check (score between 2 and 6),
  tier_distribution jsonb not null,  -- e.g. {"tier1": 2, "tier2": 2, "tier3": 1}
  universes jsonb not null,          -- 5개 우주 배열 [{name, theme, story, image_url, tier, prompt}]
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '30 days'
);

-- 만료된 결과 자동 삭제용 인덱스
create index idx_results_expires_at on public.results (expires_at);

-- Rate limiting 테이블
create table public.rate_limits (
  id bigint generated always as identity primary key,
  ip_address text not null,
  created_at timestamptz not null default now()
);

-- IP별 오늘 사용량 조회용 인덱스
create index idx_rate_limits_ip_date on public.rate_limits (ip_address, created_at);

-- 일일 전체 사용량 조회용 인덱스
create index idx_rate_limits_date on public.rate_limits (created_at);

-- RLS 활성화
alter table public.results enable row level security;
alter table public.rate_limits enable row level security;

-- results: 누구나 읽기 가능 (공유 URL), 쓰기는 service key만
create policy "results_select" on public.results
  for select using (true);

create policy "results_insert" on public.results
  for insert with check (false);  -- service_role key로만 insert

-- rate_limits: 외부 접근 불가, service key만
create policy "rate_limits_deny_all" on public.rate_limits
  for all using (false);

-- Storage bucket for generated images
insert into storage.buckets (id, name, public)
values ('universe-images', 'universe-images', true);

-- Storage policy: 누구나 읽기, 쓰기는 service key만
create policy "universe_images_select" on storage.objects
  for select using (bucket_id = 'universe-images');

create policy "universe_images_insert" on storage.objects
  for insert with check (false);  -- service_role key로만 upload
