# 24 Clothes Website

## Deploy
1. Upload the contents of this folder to the root of the existing GitHub repository (keep the `api/` folder).
2. In Vercel, keep the existing environment variables `MONGODB_URI`, `JWT_SECRET`, and `ADMIN_PASSWORD`. Never put real secrets in GitHub or HTML.
3. Deploy from Vercel. The project uses MongoDB database `24clothes` and collections `products`, `orders`, `customers`, and `counters`. Vercel will install `bcryptjs` for password hashing.

## Included
- `index.html`: storefront, product filters, IN STOCK / SOLD OUT badge, direct website ordering, Customer ID + Password registration/login, My Orders dashboard, order history, order status timeline and customer messaging.
- `api/customer-orders.js`: securely loads orders associated with order-specific access tokens saved on the customer device.
- `api/customer-auth.js`: creates customer accounts with permanent sequential IDs (`#001`, `#002`, …) and signs in using Customer ID + Password. Passwords are stored as bcrypt hashes, never as plain text.
- `api/customer-account.js`: returns the logged-in customer's profile and account-linked order history only.
- `api/customer-claim-order.js`: lets a logged-in customer link a previously placed order after verifying its Order ID + checkout phone and matching the account phone.
- `api/customers.js`: admin-only customer directory, order counts and delivered-order spending and password reset.
- `api/customers-count.js`: public registered-customer count (counts real active accounts only).
- `admin.html`: admin dashboard, order management, product management, order messages and a Customers directory with customer search, order history and admin password reset.
- `api/admin-login.js`: admin login.
- `api/products.js`: public product listing and admin-only product CRUD.
- `api/orders.js`: direct order creation, admin order listing/status updates, and server-side stock reservation. Orders cannot be placed if stock is insufficient.
- `api/track-order.js`: verifies Order ID and checkout phone once, then issues a 90-day order-scoped access token so the order can be saved in My Orders.
- `api/order-messages.js`: customer/admin order-scoped messaging.
- `api/_auth.js`: shared admin JWT verification.

## Required Vercel environment variables
- `MONGODB_URI`
- `JWT_SECRET` (use a long, unique random value)
- `ADMIN_PASSWORD` (use a strong unique password)

## Stock behavior
Product stock is read from the `stock` field. Stock above zero shows a green `IN STOCK` badge. Stock zero shows a red `SOLD OUT` badge and disables Buy Now. The order API independently checks and reserves stock in MongoDB, so bypassing the website button does not bypass stock checks.

## Customer Accounts
- Customers register with name, unique Bangladesh phone number, password (minimum 8 characters) and optional email.
- Each account receives a permanent sequential Customer ID such as `#001`. Login uses Customer ID + Password; sessions last 30 days.
- Passwords are hashed with bcryptjs. The raw password is never returned by the API or stored in MongoDB.
- A logged-in customer can see account-linked order history and send messages on their own orders. New orders are linked automatically when the checkout phone matches the account phone.
- Previous guest orders can be linked only after the customer verifies the Order ID + checkout phone and the order phone matches the account phone. Guest checkout remains available.
- Admin → Customers shows registered customers, contact details, account-linked order counts and delivered-order spending, order history and password reset.
- The storefront customer counter reflects actual active registered accounts, not visits or repeat logins.

## Customer My Orders
- A new order is automatically saved in My Orders on the same browser/device.
- For an older order, the customer opens “Track Order” / “My Orders”, enters the Order ID and checkout phone once, and verifies it.
- Saved orders show customer and delivery details, items, totals, live order status stages, and a private order-scoped chat with 24 Clothes.
- Customer order tokens are stored in that browser local storage and expire after 90 days. Clearing browser data or changing devices means the customer must verify the order again.
- Customer and Admin chat refresh automatically while the conversation is open.

## Before launch
Test a product with stock 1: place a one-unit order, verify stock becomes 0 and the storefront shows SOLD OUT; attempt a second order and verify the API rejects it. Then test Admin product editing to restock it.
