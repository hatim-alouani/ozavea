# OZAVEA — Perfume storefront starter

Next.js + TypeScript storefront for OZAVEA. Arabic is the default locale, with French and English. Customers add perfumes to a cart and submit an order request through WhatsApp (no website payment).

## Current frontend
- Responsive premium fragrance storefront
- Locale switch: `/ar`, `/fr`, `/en`
- Product cards with stock, sale price and out-of-stock states
- Cart quantity controls
- Checkout contact/address form
- WhatsApp Click-to-Chat order prefill
- Mock product data shown when the Supabase catalog is empty/unavailable

## Run locally
1. Install Node.js 20+.
2. Copy `.env.example` to `.env.local` and set your WhatsApp number.
3. Install dependencies: `npm install`
4. Start: `npm run dev`
5. Visit `http://localhost:3000` (redirects to Arabic) or `/fr` and `/en`.

## Environment variables
See `.env.example`. The WhatsApp number is international digits only (no plus, spaces or punctuation). Supabase service-role secrets must never be exposed to the browser or committed to Git.


## Supabase
The existing `supabase-schema.sql` creates the product table and a public-read policy for active products. Admin write policies and secure authentication are intentionally not yet enabled. Do not deploy the admin as a production management tool until server-side auth/authorization and RLS policies are implemented.


## WhatsApp order flow
The order button opens a `wa.me` link with customer details, product names, quantities, displayed prices, product URLs and order total. The customer must review and send the message in WhatsApp. The request is not considered confirmed until OZAVEA replies.
