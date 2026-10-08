-- Halina Travels enquiry-only CMS for Supabase
-- 1) Replace the placeholder admin email near the bottom of this file.
-- 2) Paste the complete file into Supabase SQL Editor and run it once.
-- 3) In Authentication > Users, create a user with the same email.

begin;

create schema if not exists private;

create table if not exists public.site_admins (
  email text primary key,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint site_admins_email_format check (position('@' in email) > 1)
);

create table if not exists public.site_contacts (
  id uuid primary key default gen_random_uuid(),
  contact_key text not null unique,
  contact_type text not null,
  label text not null,
  value text not null,
  url text,
  is_primary boolean not null default false,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint site_contacts_type_check check (
    contact_type in ('facebook', 'messenger', 'email', 'phone', 'whatsapp', 'instagram', 'tiktok', 'youtube', 'address', 'hours', 'other')
  )
);

create table if not exists public.catalog_items (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  item_type text not null,
  title text not null,
  summary text not null default '',
  origin text,
  destination text,
  price_amount numeric(12,2),
  price_label text not null default 'From',
  currency text not null default 'GBP',
  travel_from date,
  travel_to date,
  image_url text,
  badge text,
  inclusions text[] not null default '{}',
  terms text not null default 'Subject to availability. Fares may change until confirmed by our team.',
  cta_label text not null default 'Enquire now',
  custom_fields jsonb not null default '{}'::jsonb,
  is_featured boolean not null default false,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint catalog_items_type_check check (item_type in ('flight', 'package', 'deal')),
  constraint catalog_items_price_check check (price_amount is null or price_amount >= 0),
  constraint catalog_items_currency_check check (currency ~ '^[A-Z]{3}$'),
  constraint catalog_items_custom_fields_object check (jsonb_typeof(custom_fields) = 'object')
);

create table if not exists public.site_content (
  id uuid primary key default gen_random_uuid(),
  page_path text not null,
  label text not null,
  selector text not null,
  property text not null,
  value text not null default '',
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint site_content_property_check check (
    property in ('text', 'direct_text', 'src', 'href', 'alt', 'background_image', 'hidden')
  ),
  constraint site_content_unique_override unique (page_path, selector, property)
);

create table if not exists public.site_settings (
  setting_key text primary key,
  label text not null,
  setting_value jsonb not null default '{}'::jsonb,
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists catalog_items_public_order_idx
  on public.catalog_items (item_type, sort_order, title)
  where is_active;
create index if not exists catalog_items_destination_idx
  on public.catalog_items (lower(destination))
  where is_active and destination is not null;
create index if not exists site_contacts_public_order_idx
  on public.site_contacts (contact_type, sort_order)
  where is_active;
create index if not exists site_content_page_order_idx
  on public.site_content (page_path, sort_order)
  where is_active;

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function private.set_updated_at() from public;

drop trigger if exists set_site_contacts_updated_at on public.site_contacts;
create trigger set_site_contacts_updated_at
before update on public.site_contacts
for each row execute function private.set_updated_at();

drop trigger if exists set_catalog_items_updated_at on public.catalog_items;
create trigger set_catalog_items_updated_at
before update on public.catalog_items
for each row execute function private.set_updated_at();

drop trigger if exists set_site_content_updated_at on public.site_content;
create trigger set_site_content_updated_at
before update on public.site_content
for each row execute function private.set_updated_at();

drop trigger if exists set_site_settings_updated_at on public.site_settings;
create trigger set_site_settings_updated_at
before update on public.site_settings
for each row execute function private.set_updated_at();

create or replace function private.is_site_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and exists (
      select 1
      from public.site_admins as admin
      where admin.active
        and lower(admin.email) = lower(coalesce((select auth.jwt() ->> 'email'), ''))
    );
$$;

revoke all on function private.is_site_admin() from public;
grant usage on schema private to authenticated;
grant execute on function private.is_site_admin() to authenticated;

create or replace function public.is_current_user_site_admin()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select private.is_site_admin();
$$;

revoke all on function public.is_current_user_site_admin() from public;
grant execute on function public.is_current_user_site_admin() to authenticated;

alter table public.site_admins enable row level security;
alter table public.site_contacts enable row level security;
alter table public.catalog_items enable row level security;
alter table public.site_content enable row level security;
alter table public.site_settings enable row level security;

-- Explicit grants are required for Supabase Data API projects created after May 2026.
revoke all on public.site_admins from anon, authenticated;
grant select on public.site_contacts, public.catalog_items, public.site_content, public.site_settings to anon, authenticated;
grant insert, update, delete on public.site_contacts, public.catalog_items, public.site_content, public.site_settings to authenticated;
grant all on public.site_admins, public.site_contacts, public.catalog_items, public.site_content, public.site_settings to service_role;

drop policy if exists "public reads active contacts" on public.site_contacts;
create policy "public reads active contacts"
on public.site_contacts for select
to anon, authenticated
using (is_active);

drop policy if exists "admins read all contacts" on public.site_contacts;
create policy "admins read all contacts"
on public.site_contacts for select
to authenticated
using ((select private.is_site_admin()));

drop policy if exists "admins insert contacts" on public.site_contacts;
create policy "admins insert contacts"
on public.site_contacts for insert
to authenticated
with check ((select private.is_site_admin()));

drop policy if exists "admins update contacts" on public.site_contacts;
create policy "admins update contacts"
on public.site_contacts for update
to authenticated
using ((select private.is_site_admin()))
with check ((select private.is_site_admin()));

drop policy if exists "admins delete contacts" on public.site_contacts;
create policy "admins delete contacts"
on public.site_contacts for delete
to authenticated
using ((select private.is_site_admin()));

drop policy if exists "public reads active catalog" on public.catalog_items;
create policy "public reads active catalog"
on public.catalog_items for select
to anon, authenticated
using (is_active);

drop policy if exists "admins read all catalog" on public.catalog_items;
create policy "admins read all catalog"
on public.catalog_items for select
to authenticated
using ((select private.is_site_admin()));

drop policy if exists "admins insert catalog" on public.catalog_items;
create policy "admins insert catalog"
on public.catalog_items for insert
to authenticated
with check ((select private.is_site_admin()));

drop policy if exists "admins update catalog" on public.catalog_items;
create policy "admins update catalog"
on public.catalog_items for update
to authenticated
using ((select private.is_site_admin()))
with check ((select private.is_site_admin()));

drop policy if exists "admins delete catalog" on public.catalog_items;
create policy "admins delete catalog"
on public.catalog_items for delete
to authenticated
using ((select private.is_site_admin()));

drop policy if exists "public reads active content" on public.site_content;
create policy "public reads active content"
on public.site_content for select
to anon, authenticated
using (is_active);

drop policy if exists "admins read all content" on public.site_content;
create policy "admins read all content"
on public.site_content for select
to authenticated
using ((select private.is_site_admin()));

drop policy if exists "admins insert content" on public.site_content;
create policy "admins insert content"
on public.site_content for insert
to authenticated
with check ((select private.is_site_admin()));

drop policy if exists "admins update content" on public.site_content;
create policy "admins update content"
on public.site_content for update
to authenticated
using ((select private.is_site_admin()))
with check ((select private.is_site_admin()));

drop policy if exists "admins delete content" on public.site_content;
create policy "admins delete content"
on public.site_content for delete
to authenticated
using ((select private.is_site_admin()));

drop policy if exists "public reads public settings" on public.site_settings;
create policy "public reads public settings"
on public.site_settings for select
to anon, authenticated
using (is_public);

drop policy if exists "admins read all settings" on public.site_settings;
create policy "admins read all settings"
on public.site_settings for select
to authenticated
using ((select private.is_site_admin()));

drop policy if exists "admins insert settings" on public.site_settings;
create policy "admins insert settings"
on public.site_settings for insert
to authenticated
with check ((select private.is_site_admin()));

drop policy if exists "admins update settings" on public.site_settings;
create policy "admins update settings"
on public.site_settings for update
to authenticated
using ((select private.is_site_admin()))
with check ((select private.is_site_admin()));

drop policy if exists "admins delete settings" on public.site_settings;
create policy "admins delete settings"
on public.site_settings for delete
to authenticated
using ((select private.is_site_admin()));

-- Replace this value before running the file, then create the same user in Supabase Auth.
insert into public.site_admins (email)
values ('replace-me@example.com')
on conflict (email) do nothing;

insert into public.site_contacts (contact_key, contact_type, label, value, url, is_primary, sort_order)
values
  ('facebook-main', 'facebook', 'Facebook page', 'Halina Travels', 'https://www.facebook.com/', true, 10),
  ('messenger-main', 'messenger', 'Facebook Messenger', 'Message us on Facebook', 'https://m.me/', true, 20),
  ('email-main', 'email', 'Enquiries email', 'hello@halinatravels.co.uk', 'mailto:hello@halinatravels.co.uk', true, 30),
  ('phone-main', 'phone', 'Telephone', '020 7946 0958', 'tel:02079460958', true, 40),
  ('address-main', 'address', 'Office', '12 Stephen Mews, Fitzrovia, London W1T 1AH', null, true, 50),
  ('hours-main', 'hours', 'Opening hours', 'Mon–Fri 9:00–18:00 · Sat 10:00–16:00', null, true, 60),
  ('instagram-main', 'instagram', 'Instagram', 'Instagram', 'https://www.instagram.com/', false, 70),
  ('tiktok-main', 'tiktok', 'TikTok', 'TikTok', 'https://www.tiktok.com/', false, 80),
  ('youtube-main', 'youtube', 'YouTube', 'YouTube', 'https://www.youtube.com/', false, 90)
on conflict (contact_key) do nothing;

insert into public.site_settings (setting_key, label, setting_value, is_public)
values
  ('enquiry', 'Enquiry message defaults', '{"subject":"Travel enquiry from Halina Travels website","intro":"Kumusta! I would like to enquire about the following travel option:","copy_hint":"Copy this summary, then paste it into Facebook Messenger."}'::jsonb, true),
  ('business', 'Business identity', '{"name":"Halina Travels","currency_symbol":"£"}'::jsonb, true)
on conflict (setting_key) do nothing;

insert into public.catalog_items
  (slug, item_type, title, summary, origin, destination, price_amount, price_label, image_url, badge, inclusions, is_featured, sort_order)
values
  ('london-manila-flight', 'flight', 'London to Manila', 'Indicative return fare from London, including taxes.', 'London', 'Manila', 479, 'Return from', 'assets/img/img-05-58d168bc24.webp', 'Popular', array['Return flights', 'Taxes included', 'Baggage options available'], true, 10),
  ('london-cebu-flight', 'flight', 'London to Cebu', 'Smart one-stop routes from London to Cebu.', 'London', 'Cebu', 651, 'Return from', 'assets/img/img-06-fac233ddf8.webp', null, array['Return flights', 'Taxes included', 'Flexible route options'], true, 20),
  ('london-boracay-flight', 'flight', 'London to Boracay', 'Fly via Caticlan or Kalibo for your Boracay escape.', 'London', 'Boracay', 749, 'Return from', 'assets/img/img-07-c3155d8625.webp', null, array['Return flights', 'Taxes included', 'Island transfer advice'], false, 30),
  ('london-palawan-flight', 'flight', 'London to Palawan', 'Routes to Puerto Princesa with onward El Nido options.', 'London', 'Palawan', 799, 'Return from', 'assets/img/img-08-6c49b88a68.webp', null, array['Return flights', 'Taxes included', 'Onward connection advice'], false, 40),
  ('london-bohol-flight', 'flight', 'London to Bohol', 'Flights to Bohol–Panglao with flexible connections.', 'London', 'Bohol', 759, 'Return from', 'assets/img/img-09-95e53a2c5c.webp', null, array['Return flights', 'Taxes included', 'Baggage options available'], false, 50),
  ('london-baguio-flight', 'flight', 'London to Baguio', 'Fly to Manila or Clark with onward travel planning.', 'London', 'Baguio', 899, 'Return from', 'assets/img/img-10-989db0f4ef.webp', null, array['Return flights', 'Onward route advice', 'Baggage options available'], false, 60),
  ('london-davao-flight', 'flight', 'London to Davao', 'One-stop routes from London to Davao.', 'London', 'Davao', 909, 'Return from', 'assets/img/img-11-584de6ca5d.webp', null, array['Return flights', 'Taxes included', 'Flexible connections'], false, 70),
  ('london-siargao-flight', 'flight', 'London to Siargao', 'International and domestic connections to Siargao.', 'London', 'Siargao', 956, 'Return from', 'assets/img/img-12-c02e71a201.webp', null, array['Return flights', 'Domestic connection', 'Baggage advice'], false, 80),
  ('boracay-beach-escape', 'package', 'Boracay Beach Escape', 'Flights, 4-star beachfront resort, island hopping and sunset paraw sailing.', 'London', 'Boracay', 1299, 'Per person from', 'assets/img/img-07-c3155d8625.webp', '7 nights', array['Return flights', 'Breakfast daily', 'Island hopping'], true, 110),
  ('palawan-island-hopping', 'package', 'Palawan Island Hopping', 'Puerto Princesa, El Nido, Big Lagoon kayaking and Bacuit Bay island hopping.', 'London', 'Palawan', 1449, 'Per person from', 'assets/img/img-08-6c49b88a68.webp', '8 nights', array['Return flights', 'Underground River', 'El Nido tours'], true, 120),
  ('cebu-bohol-twin-centre', 'package', 'Cebu & Bohol Twin-Centre', 'A flexible twin-centre holiday across Mactan and Panglao.', 'London', 'Cebu & Bohol', 1399, 'Per person from', 'assets/img/img-06-fac233ddf8.webp', '9 nights', array['Return flights', 'Two islands', 'Ferry transfers'], true, 130),
  ('manila-balikbayan-reunion', 'package', 'Manila Balikbayan Reunion', 'Long-stay fares, airport pickup and optional Tagaytay side trip.', 'London', 'Manila', 899, 'Per person from', 'assets/img/img-05-58d168bc24.webp', '14 nights', array['Return flights', 'Extra baggage options', 'Flexible dates'], false, 140),
  ('siargao-surf-week', 'package', 'Siargao Surf Week', 'Surf coaching, Sugba Lagoon, island days and General Luna stays.', 'London', 'Siargao', 1549, 'Per person from', 'assets/img/img-12-c02e71a201.webp', '7 nights', array['Return flights', 'Surf lessons', 'Sugba Lagoon'], false, 150),
  ('ilocos-heritage-trail', 'package', 'Ilocos Heritage Trail', 'Laoag, Vigan, Paoay dunes, Bangui and Pagudpud with a private driver.', 'London', 'Ilocos', 1199, 'Per person from', 'assets/img/img-10-989db0f4ef.webp', '6 nights', array['Return flights', 'Private driver', 'Vigan tour'], false, 160),
  ('christmas-homecoming', 'deal', 'Christmas Homecoming Deal', 'Festive return-flight enquiry for Christmas and New Year travel.', 'London', 'Manila or Cebu', 560, 'Return from', 'assets/img/img-05-58d168bc24.webp', 'Seasonal', array['Return flights', 'Taxes included', 'Family booking support'], true, 210)
on conflict (slug) do nothing;

-- Realtime keeps open website/admin tabs synchronized after a CRUD change.
do $$
declare
  table_name text;
begin
  foreach table_name in array array['site_contacts', 'catalog_items', 'site_content', 'site_settings']
  loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = table_name
    ) then
      execute format('alter publication supabase_realtime add table public.%I', table_name);
    end if;
  end loop;
end;
$$;

commit;
