# Expiro

A lightweight PWA for tracking product expiry dates in minimarts and small retail shops. Staff add products, set expiry dates, and get notified before stock expires — reducing loss and keeping shelves clean.

---

## The Problem

Minimarts lose money on expired stock not because of negligence, but because expiry checks are visual, irregular, and rely on memory. Expiro solves this with a simple, reliable system: add a product, set the date, get reminded early enough to act.

---

## Features

- **Product entry** — photo, name, expiry date, quantity, category
- **Barcode scanning** — auto-fill product name from barcode (lazy-loaded)
- **Auto reminder logic** — 90 days before expiry by default, with edge case handling
- **Status views** — Safe / Expiring Soon / Expired with colour-coded badges
- **Search & filter** — find products instantly
- **Pull to refresh** — native-feeling refresh on mobile
- **Notifications** — SMS (Hubtel), Email (Resend), push (Android PWA)
- **Role-based access** — `super_admin`, `admin`, `staff`
- **Shop approval flow** — new shops request access, super admin approves, admin invites staff
- **Offline support** — service worker caches static assets and API responses
- **Dark mode** — system-aware theme toggle
- **PWA** — installable on iOS and Android, no app store required

---

## Tech Stack

| Layer | Choice |
|---|---|
| Frontend | Vite + React + TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| Data fetching | TanStack Query |
| Routing | React Router |
| Backend / BaaS | Supabase (PostgreSQL, Auth, Storage, Edge Functions) |
| File storage | Supabase Storage |
| Email | Resend |
| SMS | Hubtel |
| Hosting | Cloudflare Pages |
| Runtime | Bun |

---

## Project Structure

```
expiro/
├── public/
│   ├── manifest.json         # PWA manifest
│   ├── sw.js                 # Service worker (static + API caching)
│   ├── icon-192.png
│   └── icon-512.png
├── src/
│   ├── components/
│   │   ├── ui/               # shadcn/ui primitives
│   │   ├── barcode-scanner   # Lazy-loaded barcode scanner
│   │   ├── install-prompt    # PWA install banner
│   │   └── theme-toggle      # Dark/light mode
│   ├── lib/
│   │   ├── supabase.ts       # Supabase client
│   │   ├── auth.ts           # Sign in, sign out, session
│   │   ├── products.ts       # Product CRUD + status logic
│   │   └── storage.ts        # Photo upload
│   ├── pages/
│   │   ├── home.tsx          # Product list with filter/search
│   │   ├── add-product.tsx   # Add product form
│   │   ├── product-detail.tsx
│   │   ├── profile.tsx
│   │   ├── admin.tsx         # Staff approval queue
│   │   └── login.tsx
│   └── main.tsx
├── supabase/
│   └── functions/
│       └── send-reminders/   # Daily cron — checks reminders, sends SMS + email
├── .env.local
└── README.md
```

---

## Database Schema

```sql
-- Shops
CREATE TABLE shops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  location TEXT,
  status TEXT DEFAULT 'pending', -- 'pending' | 'active'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User profiles
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  name TEXT,
  phone TEXT,
  role TEXT DEFAULT 'staff', -- 'super_admin' | 'admin' | 'staff'
  shop_id UUID REFERENCES shops(id),
  push_token TEXT,
  status TEXT DEFAULT 'pending', -- 'pending' | 'approved'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Products
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  photo_url TEXT,
  expiry_date DATE NOT NULL,
  reminder_date DATE NOT NULL,
  quantity INTEGER DEFAULT 1,
  category TEXT,
  shop_id UUID REFERENCES shops(id),
  added_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notification log
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  type TEXT NOT NULL,   -- 'push' | 'email' | 'sms'
  status TEXT NOT NULL, -- 'sent' | 'failed'
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  error_message TEXT
);
```

---

## Reminder Logic

```
Expiry > 90 days away  →  remind 90 days before
Expiry < 90 days away  →  remind 7 days before
Reminder date already past  →  alert immediately
Product already expired  →  flag as expired
```

Status is calculated client-side in real time:

```ts
if (daysUntilExpiry < 0)   → 'expired'
if (daysUntilExpiry <= 30) → 'expiring_soon'
else                        → 'safe'
```

---

## Role Hierarchy

```
super_admin
  └── approves new shops (admins)
      admin
        └── approves their own staff
            staff
              └── adds and views products
```

- Super admin never manages staff directly
- Admin is scoped to their shop only
- Staff invite via a shop-specific link or code

---

## Onboarding Flow

```
New user signs up
  └── fills in name, business name, phone, location
      └── account status = pending
          └── super admin approves → status = active, role = admin
              └── admin shares invite link
                  └── staff sign up via link (no business details needed)
                      └── admin approves staff → they can use the app
```

---

## Notification Strategy

Notifications are **server-side only** — never triggered from the device.

| Channel | Trigger | Provider |
|---|---|---|
| SMS | Daily cron at 8am | Hubtel |
| Email | Daily cron at 8am | Resend |
| Push | Daily cron at 8am | Expo Push / Web Push |

The Supabase Edge Function runs daily, queries products where `reminder_date = today`, and dispatches all three channels. Every notification is logged to the `notifications` table.

---

## Service Worker Caching

| Request type | Strategy |
|---|---|
| JS / CSS / fonts / images | Cache-first |
| Supabase + UploadThing API | Network-first, fallback to cache |
| HTML pages | Network-first, fallback to cache |
| Everything else | Network, fallback to cache |

Cache names are versioned (`expiro-static-v2`, `expiro-api-v2`). Old caches are purged on activate.

---

## Getting Started

### 1. Clone and install

```bash
git clone https://github.com/yourname/expiro.git
cd expiro
bun install
```

### 2. Set up Supabase

- Create a project at [supabase.com](https://supabase.com)
- Run the schema SQL above in the SQL editor
- Enable Row Level Security on all tables
- Get your project URL and anon key

### 3. Environment variables

```bash
cp .env.example .env.local
```

```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
RESEND_API_KEY=your_resend_key
HUBTEL_CLIENT_ID=your_hubtel_client_id
HUBTEL_CLIENT_SECRET=your_hubtel_client_secret
```

### 4. Deploy the Edge Function

```bash
supabase functions deploy send-reminders
```

Set up a cron schedule in the Supabase dashboard:
```
0 8 * * *   →   send-reminders
```

### 5. Run locally

```bash
bun run dev
```

### 6. Build

```bash
bun run build
```

---

## Deployment

**Frontend → Cloudflare Pages**

1. Push repo to GitHub
2. Connect to Cloudflare Pages
3. Build command: `bun run build`
4. Output directory: `dist`
5. Add environment variables in the Cloudflare dashboard

Every push to `main` deploys automatically.

---

## Accounts You Need

| Service | Purpose | Cost |
|---|---|---|
| Supabase | Database, auth, storage, edge functions | Free |
| Cloudflare Pages | Frontend hosting | Free |
| Resend | Email notifications | Free (3k/month) |
| Hubtel | SMS notifications | ~$0.01/SMS |

**Total: ~$1–2/month** (SMS only)

---

## Roadmap

- [x] Product entry with photo
- [x] Barcode scanning
- [x] Expiry status badges
- [ ] Push / SMS / email notifications
- [x] Role-based access (admin / staff)
- [x] PWA
- [x] Dark mode
- [ ] Multi-shop support (super_admin role)
- [ ] Batch product entry
- [ ] Expiry heatmap
- [ ] Loss reports (expired stock value)
- [ ] Web admin dashboard

---

## License

Proprietary. Built for internal use.