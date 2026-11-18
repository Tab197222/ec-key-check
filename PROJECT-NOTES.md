# iLoveLatins: where things stand (14 Nov 2026)

Live preview: https://tab197222.github.io/ec-key-check/
Owner page: https://tab197222.github.io/ec-key-check/admin.html
Code: GitHub Tab197222/ec-key-check, branch `new-site` (published from `gh-pages`).
Setup details: SETUP.md. WhatsApp invitations for women: invitaciones-whatsapp.md.

## Built and working
- Public pages: Home, Tours (dates, prices, Cartagena side trip, events venue
  Hotel American Golf with slideshow, Google Flights link), How it works, About Sam,
  Testimonials (11 letters), Tour videos, Questions, Safety, Contact.
- Members: join, profiles with photos/videos and details (height ft/in or cm),
  approval by owner, Verified badge, likes, messaging (women free; free men send
  1/week and can't read replies until they pay), translate button, email alerts.
- Payments (Stripe TEST mode): memberships $29.99/month, $150/6 months, $250/year;
  tour packages pay in full today or $250 deposit (deposit = regular price, $250 more);
  emails to the man and both owners; payments listed on the approvals page.
- Contact form emails both owners. Private hit counter on the approvals page.
- All emails send from ilovelatinsvacations@gmail.com (Gmail App Password).

## Added 18 Nov 2026
- Social media: Facebook Page and Instagram (ilovelatinstours) are linked from the home
  page, Contact page and footer as logo buttons. Setup text is in social-media.md.
- Owner helper pages (not in the menu, hidden from Google):
  posts.html has 20 ready-made posts (pictures + captions, 6 in Spanish for women);
  invites.html has the WhatsApp invitations with copy buttons.
  Post pictures are made from tools/social-cards.html by `python tools/make_posts.py`.
- Share-preview tags on public pages: `python tools/social_tags.py` (change SITE in it
  when the domain moves).
- Visitors report now shows where visits came from. Links can carry ?from=instagram etc.
- Spanish: an Español / English button is on every page. The public pages are translated
  by js/lang.js using js/es/<page>.js. **After changing any English text on a public page,
  run `python tools/translations.py`**: it lists pieces with no Spanish yet; add them to
  tools/strings/<page>.es.json and run it again. Tours and videos in js/data.js have
  `_es` lines next to the English ones.

## Still to do (needs other people)
1. Stripe "Verify your business", then switch the site to live keys.
2. Lawyer: privacy policy, terms (deposit and crossed-out price rules), IMBRA question.
3. Site guy: point ilovelatins.com at the new site (DNS is on HostGator).
4. Invite women (WhatsApp messages ready) and approve/verify them quickly.
5. Ask permission: past-tour guests in photos, Hotel American Golf for its photos.
6. Newer testimonials, and an email sign-up box (with consent) for tour news.

## To pick up again
Open this folder in Claude Code and say: "continue from PROJECT-NOTES.md".
Supabase changes need a short-lived access token (Project, Full access, 1 day);
delete it afterwards.
