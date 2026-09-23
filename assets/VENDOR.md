# Vendored third-party code

Files here that we did not write, recorded so they can be verified and updated
deliberately rather than silently.

## assets/supabase.js

| | |
|---|---|
| Package  | `@supabase/supabase-js` |
| Version  | 2.117.0 |
| Source   | https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.0/dist/umd/supabase.js |
| Size     | 218318 bytes |
| SHA-256  | `84ee9bf45695c1dd3ba1595b6bcfb0f09672434631351ffc8ebe9140545d5ff6` |
| SRI      | `sha384-iLddHTLokph6Omwoyid4XKxHaWa6w41BnoEj0q5oOrzmYPpHIKt1wyjReA7s//pP` |
| Obtained | 2026-09-22 |

Served from our own domain, never from a CDN at page load, so a third party
cannot change what runs on the site.

### Verify the file has not been altered

    shasum -a 256 assets/supabase.js

The result must equal the SHA-256 above. If it differs, the file was changed —
do not deploy it.

### Updating

Download the new version, record its version and hashes here, then test
sign-in, sign-up and the OTP code before deploying.
