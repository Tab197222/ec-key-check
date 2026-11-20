# Moving ilovelatins.com to the new site

The new site is hosted on GitHub Pages. Only the DNS records at HostGator need to
change; nothing moves off the web developer's server.

## Message to send the web developer

> Hi, it's Trent. The new iLoveLatins site is ready and we'd like ilovelatins.com to
> point to it. It's hosted on GitHub Pages, so only DNS needs to change at HostGator;
> nothing moves off your server.
>
> Could you please set these records for ilovelatins.com:
>
> **Four A records for the root domain (@):**
> 185.199.108.153
> 185.199.109.153
> 185.199.110.153
> 185.199.111.153
>
> **One CNAME record for www:**
> tab197222.github.io
>
> Please remove the existing A record for @ and www that points to the current
> WordPress server, and **leave the MX and any other mail records exactly as they
> are**, so email keeps working.
>
> Before you change anything, could you tell me:
> 1. Is any email address on @ilovelatins.com in use?
> 2. Is there anything else on that domain besides the WordPress site (subdomains,
>    forms, redirects)?
> 3. When could you make the change? We need about 30 minutes on our side at the
>    same time.
>
> You can see the new site here: https://tab197222.github.io/ec-key-check/
>
> Thanks!

The four addresses are GitHub's standard ones. They can be confirmed on GitHub's help
page "Managing a custom domain for your GitHub Pages site".

## Before the switch
- The old WordPress site goes offline for visitors the moment DNS changes. Save
  anything Sam wants from it first.

## Our side on the day (about 30 minutes, Claude can do these)
1. Add a `CNAME` file containing `ilovelatins.com` to the site and set the custom
   domain in the GitHub repository's Pages settings; turn on "Enforce HTTPS" once
   GitHub has issued the certificate.
2. `tools/social_tags.py`: change SITE to `https://ilovelatins.com/` and run it.
3. Supabase: change the `SITE_URL` function secret, and the Site URL and redirect
   addresses under Authentication, to `https://ilovelatins.com`.
4. Links written into text: the Spanish sign-up link in `posts.html` and
   `invites.html` (LINK), `social-media.md`, `invitaciones-whatsapp.md`.
5. Change the website link on the Facebook Page, Instagram bio and YouTube channel
   (keep `?from=facebook` and `?from=instagram` on the end).
6. Stripe: check the payment return addresses use the new domain.

## Still open before promoting to paying customers
- Stripe "Verify your business" and live keys.
- Lawyer: privacy policy, terms, IMBRA question. Then add Privacy and Terms pages,
  footer links, and "I agree" tick boxes on sign-up and the reservation form.
