# 24 CLOTHES — Full E-commerce Website

A mobile-first fashion storefront and admin workspace for Vercel + MongoDB Atlas.

## Customer experience

- Visitors can browse the complete storefront, search/filter products, view photos, sizes, prices and stock without signing in.
- Selecting **Buy Now** opens customer login. New shoppers can create an account at that point; returning shoppers sign in with their permanent Customer ID and password.
- Orders are accepted only from an authenticated customer account. The checkout phone number must match the account phone number.
- Customer accounts are stored in MongoDB (`customers` collection). Passwords are hashed with bcrypt; passwords and database credentials are never placed in browser code.
- Each successful order is saved in MongoDB and linked to the customer's permanent Customer ID.
- Customers can view order history, track status, and send order-specific messages to the store.
- Previous guest orders can be verified using Order ID + phone and claimed into an account when the phone matches.

## Store / admin features

- Admin dashboard, order totals and status breakdown, revenue metrics, order search and status updates.
- Product create/edit/delete, photo URLs, category, price, sizes and stock.
- Customer directory, customer order counts and password reset.
- Order-specific customer support messages.
- Existing store policies retained: delivery ৳60 inside Chattogram and ৳135 outside Chattogram; product exchange is available (conditions should be confirmed with the store).

## Project structure

- `index.html` — public storefront + customer account and checkout UI
- `admin.html` — protected admin workspace
- `api/` — Vercel serverless API routes
- `vercel.json` — Vercel function configuration
- `package.json` — Node dependencies
- `.env.example` — names of required environment variables (no secrets)

## Deploy to Vercel

1. Upload/replace the project files in the **root** of the GitHub repository. Make sure the homepage is named exactly `index.html` (lowercase, no spaces), not `Index .html` or `index-updated.html`.
2. Keep `api/`, `package.json`, and `vercel.json` at the repository root. Do not put the whole project inside an extra nested folder.
3. In Vercel → Project → Settings → Environment Variables, set:
   - `MONGODB_URI` — the existing MongoDB Atlas connection string. Keep the existing `24clothes` database and its current data.
   - `JWT_SECRET` — a long, random secret (at least 32 random bytes). Use the same value for all deployments/environments that need to validate existing sessions.
   - `ADMIN_PASSWORD` — a strong admin password.
4. In MongoDB Atlas Network Access, allow the Vercel deployment to connect. For a quick test, Atlas supports `0.0.0.0/0`, but restrict access where possible and use a strong database user password.
5. Redeploy from Vercel after uploading files and saving environment variables.
6. Open `/` and `/admin.html` to test the storefront and admin login.

## End-to-end launch checklist

- [ ] Homepage loads at `/` (not a 404).
- [ ] Product list loads from `/api/products`.
- [ ] Visitor can browse without signing in.
- [ ] Buy Now asks for login or account creation.
- [ ] A new account receives a permanent Customer ID; log out and log in again with the same ID/password.
- [ ] A customer can place an order with the account phone number.
- [ ] The order appears in Admin → Orders and is linked to the Customer ID.
- [ ] Admin can change order status; customer sees the updated status.
- [ ] Customer and admin can exchange messages for that order.
- [ ] Admin can add/edit a product and stock changes are reflected in the storefront.

## Important notes

- Existing `products` and `orders` data in database `24clothes` are not deleted or reset by this project.
- Customer accounts use a separate `customers` collection and a `counters` document for permanent sequential IDs.
- Do not commit `.env` files, MongoDB credentials, JWT secrets, admin passwords, or customer passwords to GitHub.
- A successful local syntax check does not replace a live Vercel + Atlas end-to-end test. Confirm all environment variables and Atlas network access before accepting real orders.
