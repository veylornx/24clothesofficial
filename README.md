# 24 Clothes — Final Website Package

This is the complete Vercel-ready project. Upload the **contents** of this folder to the root of your existing GitHub repository (not the ZIP itself). Keep the `api/` folder and file paths unchanged.

## Features
- Mandatory customer login/register gate before storefront access.
- Permanent sequential Customer IDs (`#001`, `#002`, ...); login with Customer ID + password. Phone is required during registration; OTP is not used; email is optional.
- Password hashing with bcrypt; signed customer/admin sessions.
- Customer account page, saved order history, order tracking, status timeline, and order-specific customer/admin messaging.
- Admin dashboard at `/admin.html`: secure admin login, order search/status updates, sales metrics, customer directory/search, customer order history/password reset, product management and stock control.
- Product availability: stock > 0 shows IN STOCK; stock = 0 shows SOLD OUT and disables ordering. API reserves stock when an order is created.
- Referral code field; optional for customers.
- Delivery charge: ৳60 inside Chattogram and ৳135 outside Chattogram. Product exchange is available.
- MongoDB database: `24clothes`; collections include `products`, `orders`, `customers`, and `counters`.

## Required Vercel Environment Variables
Set these in Vercel → Project → Settings → Environment Variables. Keep real values private; never commit a `.env` file.

- `MONGODB_URI` — your MongoDB connection string
- `JWT_SECRET` — long, unique random secret (same value across deployments)
- `ADMIN_PASSWORD` — strong admin password

No secrets are embedded in HTML or this ZIP.

## Deploy
1. Extract this ZIP.
2. Upload all extracted files and folders to the **root** of the existing GitHub repository. `index.html`, `admin.html`, `package.json`, `vercel.json`, and `api/` must be at the repository root.
3. In Vercel, use the existing project connected to that GitHub repository. Framework Preset: **Other**; Root Directory: `./`; Build Command: leave empty; Output Directory: leave empty. Vercel will install the dependencies from `package.json` and deploy the `/api/*.js` serverless functions.
4. Confirm the three environment variables above are present for Production (and Preview if you test previews), then redeploy.
5. Open the deployed site. New customers register with name, phone, password (8+ characters), optional email. They receive a permanent Customer ID. Next time they log in using that ID and password.
6. Admin dashboard: open `/admin.html` and sign in with `ADMIN_PASSWORD`.

## API files included
- `api/admin-login.js`, `api/_auth.js` — admin authentication
- `api/products.js` — public product listing and admin product CRUD
- `api/orders.js` — order creation, admin order listing/status updates, stock reservation
- `api/track-order.js`, `api/customer-orders.js` — order verification and saved order access
- `api/order-messages.js` — order-specific customer/admin chat
- `api/customer-auth.js`, `api/customer-account.js`, `api/customer-claim-order.js` — customer registration/login/account/order linking
- `api/customers.js`, `api/customers-count.js` — admin customer directory and real registered-customer count

## Important
- This ZIP contains the complete website code, but it cannot contain your private MongoDB/Vercel secrets. The site will not authenticate or persist data until those three Vercel environment variables are correctly configured.
- Existing MongoDB product/order data is not deleted by deploying these files. Back up your database before making unrelated database changes.
- After deployment, test customer registration/login, an order, admin status update, customer order tracking/chat, and stock deduction before sharing the site publicly.
