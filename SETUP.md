# Switching on member accounts and payments

The site works now without any of this: the join page sends Sam an email, and the
member pages say sign-up is being set up. Follow these steps to switch on real
accounts, photo and video uploads, messaging and card payments.

Two free accounts are needed: **Supabase** (stores accounts, profiles, photos,
videos and messages) and **Stripe** (takes card payments). Do everything in
Stripe's **test mode** first, try a sign-up and a payment, then repeat the Stripe
part in live mode.

## 1. Supabase: the database

1. Sign up at https://supabase.com and create a new project. Write down the
   database password it asks for.
2. In the project, open **SQL Editor**, paste the whole of `supabase/schema.sql`,
   and press **Run**. It should say "Success". Run it only once.
3. Open **Authentication > URL Configuration**:
   - **Site URL**: `https://tab197222.github.io/ec-key-check/`
     (later, `https://ilovelatins.com/`)
   - **Redirect URLs**: add `https://tab197222.github.io/ec-key-check/account.html`
4. Open **Project Settings > API** and copy the **Project URL** and the
   **anon / publishable key**. Paste them into `js/config.js`, or send them to
   Claude to do it. Both are safe to publish.

## 2. Make yourself the site owner

1. On the site, press **Join free**, create an account, confirm the email, and
   save a profile on **My account**.
2. In Supabase **SQL Editor**, run this with your own email:

   ```sql
   update profiles set is_admin = true, status = 'approved'
   where id = (select id from auth.users where email = 'YOUR-EMAIL-HERE');
   ```

3. You can now open `admin.html` on the site to approve profiles, photos and
   videos, and to deal with reports.

## 3. Stripe: payments

1. Sign up at https://stripe.com. Keep **Test mode** switched on for now.
2. **Product catalog > Add product**: name it "iLoveLatins membership" and add
   two recurring prices: **$39.99 monthly** and **$299 yearly**. Copy each price's
   ID (`price_…`). A product's ID (`prod_…`) also works if that product has only
   one price.
3. **Developers > API keys**: copy the **Secret key** (starts with `sk_test_`).
   Never put this key in the website files.
4. **Settings > Billing > Customer portal**: turn it on and allow customers to
   cancel and update their card. This is what "Manage billing or cancel" opens.

## 4. Supabase: the payment functions

1. In Supabase, open **Edge Functions** and create four functions with these exact
   names, pasting in the matching file from `supabase/functions/`:
   - `create-checkout`
   - `stripe-webhook`: turn **off** "Verify JWT" for this one only
   - `billing-portal`
   - `notify-admin`
2. Open **Edge Functions > Secrets** and add:

   | Name | Value |
   |---|---|
   | `STRIPE_SECRET_KEY` | the `sk_test_…` key |
   | `STRIPE_PRICE_MONTHLY` | the `price_…` ID of the $39.99 price |
   | `STRIPE_PRICE_YEARLY` | the `price_…` ID of the $299 price |
   | `SITE_URL` | `https://tab197222.github.io/ec-key-check` |
   | `STRIPE_WEBHOOK_SECRET` | from step 5 below |

3. Optional, to get an email whenever a profile is waiting for approval: create
   a free https://resend.com account and add `RESEND_API_KEY` and `ADMIN_EMAIL`
   (your email). Without these, check `admin.html` yourself.

## 5. Connect Stripe back to the site

1. In Stripe, **Developers > Webhooks > Add endpoint**.
2. Endpoint URL: `https://YOUR-PROJECT.supabase.co/functions/v1/stripe-webhook`
   (use your Project URL from step 1.4).
3. Events: `checkout.session.completed`, `customer.subscription.updated`,
   `customer.subscription.deleted`.
4. Copy the **Signing secret** (`whsec_…`) into the `STRIPE_WEBHOOK_SECRET`
   secret in Supabase.

## 6. Test it

1. Create a test man's account, fill in the profile, add a photo, and send it
   for approval.
2. Approve it on `admin.html`.
3. On **Membership**, choose a plan and pay with Stripe's test card
   `4242 4242 4242 4242`, any future date and any CVC.
4. Back on **My account**, the membership should show as active within a minute.
5. Create a test woman's account in another browser, approve it, and send
   messages both ways.

When it all works, repeat section 3 and section 5 in Stripe's **live mode** and
replace the test values in the Supabase secrets with the live ones.

## Before taking real money

- **Email sending.** Supabase's built-in email only sends a few messages an hour.
  For real sign-ups, add your own sender under
  **Project Settings > Authentication > SMTP** (Resend works for this).
- **Privacy policy and terms.** You need both before taking payments or storing
  people's photos. Have a lawyer write them. Ask in particular whether the US
  International Marriage Broker Regulation Act (IMBRA) applies to you: it covers
  paid services introducing US citizens to foreign nationals and has its own rules.
- **Stripe's rules.** Stripe limits some dating and introduction businesses.
  Read their restricted businesses list, or ask Stripe support, before going live.

## How it works

- **Women** join and message free. **Men** get one message a week free, or
  unlimited messages with a paid plan.
- **Approval.** Every new profile, and every photo or video added later, stays
  hidden until you approve it on `admin.html`.
- **Who sees what.** Visitors who are not logged in see first name, age, city and
  main photo. Full profiles, all photos and videos, and messaging need an
  approved profile.
- **Limits.** Up to 8 photos (10 MB each) and 2 videos (50 MB each) per member.
  Supabase's free plan includes 1 GB of file storage, so expect to upgrade as
  the site grows.
- **Reports and blocking.** Members can report or block anyone. Reports appear
  on `admin.html`.
- **Deleting an account.** Members can delete their own account, which removes
  their profile, photos, videos and messages.
