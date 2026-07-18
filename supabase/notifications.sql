-- Optional: email Avi whenever a new tribute comes in for review.
-- Run this in the Supabase SQL editor AFTER schema.sql.
--
-- This uses pg_net (a Supabase extension) to call the Resend API directly
-- from a database trigger — no Edge Function or CLI deploy needed.
--
-- Setup (one-time):
--   1. Create a free account at https://resend.com and grab an API key.
--      The free tier can send from "onboarding@resend.dev" to your own
--      verified account email with no domain setup.
--   2. In the SQL editor, run the two ALTER DATABASE commands below with
--      your real key and email filled in. Run them as a ONE-OFF command,
--      separately from this file — do not commit your real key/email to
--      the repo, since it's public.
--
--     alter database postgres set app.resend_api_key = 'your-resend-api-key';
--     alter database postgres set app.admin_email = 'you@example.com';
--
--   3. Run the rest of this file (the extension + function + trigger).
--
-- To disable notifications later: drop trigger on_new_tribute_notify on tributes;

create extension if not exists pg_net;

create or replace function notify_admin_of_new_tribute()
returns trigger as $$
declare
  api_key text := current_setting('app.resend_api_key', true);
  admin_email text := current_setting('app.admin_email', true);
begin
  -- Silently skip if the one-time setup above hasn't been done yet.
  if api_key is null or admin_email is null then
    return new;
  end if;

  perform net.http_post(
    url := 'https://api.resend.com/emails',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || api_key,
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'from', 'Obliteride Sky <onboarding@resend.dev>',
      'to', array[admin_email],
      'subject', '🏮 New tribute waiting for approval',
      'html', format(
        '<p><strong>%s</strong></p><p>%s</p><p>From: %s</p><p><a href="https://mizrahia.github.io/Obliteride2026/admin.html">Review it in the admin queue →</a></p>',
        initcap(replace(new.type, '_', ' ')),
        new.message,
        coalesce(nullif(new.display_name, ''), 'Anonymous')
      )
    )
  );

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_new_tribute_notify on tributes;
create trigger on_new_tribute_notify
  after insert on tributes
  for each row
  execute function notify_admin_of_new_tribute();
