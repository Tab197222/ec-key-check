# Where we left off (paused 2026-11-11)

The public site (index, tours, about, etc.) is finished and live at
https://tab197222.github.io/ec-key-check/ (served from the `gh-pages` branch).

## In progress: member accounts, uploads, payments, messaging

Decisions made:
- Men pay ($39/month or $299/year via Stripe); women free.
- Profiles, photos and videos go live only after one-click approval.
- Built-in messaging between members; free men get 1 message a week.

Done (not yet connected or tested):
- `supabase/schema.sql` - database tables, security rules, file storage.
- `supabase/functions/` - Stripe checkout, Stripe webhook, billing portal, approval email.
- `js/config.js` (empty keys), `js/app.js`, `js/join.js`, `js/account.js`.

Still to do:
- Add the password-reset marker (`recovery`) to `js/app.js` (used by account.js).
- Write `js/members.js`, `js/member.js`, `js/messages.js`, admin approvals page.
- Write the HTML pages: join (replace current), account, members, member, messages, membership, admin.
- Add YouTube videos from Sam's channel (UC0e3Sihl2Rv7mmomxRlf73g), Sept 2019 tour.
  Picked: K-8WZNkQPOQ, WmqkM2xOhkY (day 1), WLwA71GS3Mg, 5znW_2c8XS0 (day 2), QNyH4jRfwDM, ao4ZzGIefhc (day 3).
- Navigation, styles, browser check, then a setup guide (Supabase + Stripe accounts).
