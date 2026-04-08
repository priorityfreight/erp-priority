alter table public.mailboxes
  add column if not exists signature_image_url text;

comment on column public.mailboxes.signature_image_url is
  'Public image URL appended as the outbound email signature for this mailbox.';
