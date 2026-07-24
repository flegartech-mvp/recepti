-- Remove the obsolete single-owner administration entry point now that every
-- deployment is required to use an explicit multi-owner allowlist.
--
-- This does not alter existing allowlist rows. Administrators synchronize the
-- complete set with private.configure_owner_emails(text[], true).

drop function if exists private.configure_owner_email(text);

comment on function private.configure_owner_emails(text[], boolean) is
  'Administrator-only normalized multi-owner allowlist configuration. Additive by default; exact replacement requires an explicit true flag.';
