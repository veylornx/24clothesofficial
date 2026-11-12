# 24C Clothing Website — বাংলা Setup Guide

এই প্রজেক্টে আছে:
- Premium minimal clothing storefront
- Supabase database থেকে product load
- Customer order form
- Admin email/password login
- Admin product add/delete
- Admin order list ও status update

## 1) Supabase project তৈরি
1. https://supabase.com এ গিয়ে account খুলুন।
2. New project তৈরি করুন এবং database password নিরাপদে রাখুন।
3. Project Dashboard > SQL Editor > New query খুলুন।
4. এই repository-র `supabase-setup.sql` ফাইলের সম্পূর্ণ SQL paste করে Run করুন।
5. Project Settings > API (বা API Keys) থেকে Project URL এবং anon/publishable key কপি করুন। `service_role` বা secret key কখনো ব্যবহার করবেন না।

## 2) প্রথম Admin account তৈরি
1. Website deploy হওয়ার পর `https://YOUR-SITE.vercel.app/admin` খুলুন।
2. `Create the first account` চাপুন।
3. আপনার নিজের email ও অন্তত 8-character password দিয়ে account তৈরি করুন।
4. Email confirmation চালু থাকলে inbox থেকে confirm করুন।
5. Supabase Dashboard > Authentication > Users-এ যান।
6. আপনার email-এর User ID (UUID) কপি করুন।
7. Supabase > SQL Editor-এ নিচের SQL চালান (নিজের তথ্য বসিয়ে):

```sql
insert into public.admins (id, email)
values ('PASTE-YOUR-USER-UUID-HERE', 'YOUR-ADMIN-EMAIL-HERE');
```

এখন `/admin` এ ফিরে email/password দিয়ে login করুন। Admin অনুমতি database থেকে যাচাই হয়। শুধু account তৈরি করলেই admin হওয়া যায় না।

## 3) GitHub-এ upload
1. https://github.com এ account খুলুন।
2. New repository তৈরি করুন: `24c-clothing`.
3. ZIP extract করে সব ফাইল repository-র root-এ upload করুন। `app`, `lib`, `package.json`, `supabase-setup.sql` ইত্যাদি root-এ থাকবে।
4. `.env.example` শুধু নমুনা। আসল `.env.local` বা কোনো secret key GitHub-এ upload করবেন না।

Android-এ GitHub website-এর Add file > Upload files ব্যবহার করতে পারেন। ZIP সরাসরি upload করলে GitHub সেটি project হিসেবে extract করে না; আগে extract করতে হবে।

## 4) Vercel-এ deploy
1. https://vercel.com এ যান।
2. Continue with GitHub চাপুন।
3. Add New > Project নির্বাচন করে `24c-clothing` repository Import করুন।
4. Framework হিসেবে Next.js auto-detect হবে।
5. Environment Variables-এ দুইটি variable যোগ করুন:
   - `NEXT_PUBLIC_SUPABASE_URL` = Supabase Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = Supabase anon/publishable key
6. Deploy চাপুন।
7. Deploy শেষ হলে Vercel website URL পাবেন।

যদি Environment Variable পরে যোগ করেন, Vercel > Project > Settings > Environment Variables থেকে Save করে Redeploy করুন।

## 5) Supabase Auth URL settings
Supabase > Authentication > URL Configuration:
- Site URL: আপনার Vercel URL
- Redirect URLs: আপনার Vercel URL এবং `https://YOUR-SITE.vercel.app/**` যোগ করুন।

## 6) Product যোগ
Admin panel > Products > Add a new product:
- Product name
- Price
- Description
- Image URL (public image URL)
- Tag (optional)

তারপর Add product চাপুন। Image URL অবশ্যই public HTTPS image link হতে হবে।

## Important security notes
- `service_role` / secret key কখনো browser, GitHub বা `NEXT_PUBLIC_` variable-এ দেবেন না।
- প্রথম Admin তৈরি হওয়ার পর Admin page-এর signup feature বন্ধ করতে চাইলে Supabase Authentication settings-এ public signups disable করুন। তবে পরে নতুন admin যোগ করতে Dashboard থেকে user তৈরি করে admins table-এ add করতে হবে।
- Admin access দিতে UUID যাচাই করে তারপর `admins` table-এ add করবেন।
- এটি starter store। Payment gateway, courier integration, stock/size-specific inventory, image upload storage, email notifications এখনো যুক্ত করা হয়নি।
