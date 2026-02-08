# Expiro

**Minimart Product Expiry Tracking & Notification System**

A Progressive Web App (PWA) designed to help minimarts and small retail shops track product expiry dates and receive timely notifications before products expire, reducing waste and financial loss.

---

## 🎯 The Problem

Small retail shops lose money from expired products because:

- Stock checking is visual and irregular
- Staff rely on memory instead of systems
- Most shops don't use full inventory software
- Expiry checks happen too late

This leads to:
- Direct financial loss
- Reduced customer trust
- Regulatory and health risks

---

## 💡 The Solution

Expiro is a simple, reliable mobile-first web app that:

1. **Tracks expiry dates** - Staff photograph products and select expiry dates
2. **Calculates reminders** - System automatically sets alerts (default: 90 days before expiry)
3. **Sends notifications** - Alerts via SMS, email, and push notifications (Android PWA)
4. **Organizes products** - Clear status views: Safe, Expiring Soon, Expired

**Core Philosophy:** Simple, fast data entry. No barcode scanning, no OCR, no complexity—just photo + date + save.

---

## 🏗️ Architecture

### Tech Stack

**Frontend**
- Vite + React + TypeScript
- TanStack Query (data fetching & caching)
- Shadcn/ui (UI components)
- React Router (routing)
- Tailwind CSS (styling)
- Workbox (service worker for offline support)

**Backend**
- Supabase (PostgreSQL database, authentication, storage)
- Supabase Edge Functions (cron jobs for notifications)

**Hosting**
- Cloudflare Pages (frontend - FREE)
- Supabase (backend - FREE tier)

**Notifications**
- Resend (email notifications - FREE 3k/month)
- Hubtel (SMS notifications - Ghana, pay-per-use ~$0.01/SMS)
- Expo Push Notifications (Android PWA only)

**File Storage**
- Supabase Storage (1GB free, unlimited bandwidth)

---

## 📊 Database Schema

```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'staff', -- 'owner' or 'staff'
  push_token TEXT, -- For push notifications
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Products table
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  photo_url TEXT, -- Supabase Storage URL
  expiry_date DATE NOT NULL,
  reminder_date DATE NOT NULL, -- Auto-calculated
  quantity INTEGER DEFAULT 1,
  category TEXT, -- Optional: 'dairy', 'snacks', etc.
  status TEXT DEFAULT 'safe', -- 'safe', 'expiring_soon', 'expired'
  added_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications log (audit trail)
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'push', 'email', 'sms'
  status TEXT NOT NULL, -- 'sent', 'failed', 'pending'
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  error_message TEXT -- If failed
);

-- Indexes for performance
CREATE INDEX idx_products_reminder_date ON products(reminder_date);
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_products_expiry_date ON products(expiry_date);
CREATE INDEX idx_notifications_product_id ON notifications(product_id);
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account (free tier)
- Cloudflare account (for deployment)
- Resend account (for emails)
- Hubtel account (for SMS in Ghana)

### Environment Variables

Create `.env` file in project root:

```env
# Supabase
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Resend (Email)
VITE_RESEND_API_KEY=your_resend_api_key

# Hubtel (SMS)
VITE_HUBTEL_CLIENT_ID=your_hubtel_client_id
VITE_HUBTEL_CLIENT_SECRET=your_hubtel_client_secret
```

### Installation

```bash
# Clone repository
git clone <repository-url>
cd expiro

# Install dependencies
npm install

# Start development server
npm run dev
```

### Database Setup

1. Create Supabase project at [supabase.com](https://supabase.com)
2. Run the SQL schema (see Database Schema section above) in Supabase SQL Editor
3. Enable Row Level Security:

```sql
-- Enable RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Users can only see/modify their own products
CREATE POLICY "Users manage own products"
ON products FOR ALL
USING (added_by = auth.uid());
```

### PWA Setup

The app is configured as a Progressive Web App with:

- Manifest file (`public/manifest.json`)
- Service worker (Workbox)
- Offline support
- Install prompt for iOS/Android

To test PWA features:
```bash
npm run build
npm run preview
```

Visit on mobile device and add to home screen.

---

## 📱 Features

### Core Features (MVP)

✅ **Product Entry**
- Take product photo (camera access)
- Select expiry date (date picker)
- Optional: product name, quantity, category
- Auto-calculate reminder date (90 days before expiry, adjustable)

✅ **Product List**
- View all products sorted by expiry date
- Status badges: Safe (green), Expiring Soon (yellow), Expired (red)
- Filter by status
- Pull-to-refresh

✅ **Notifications**
- Daily cron job checks reminder dates
- SMS to shop manager/owner
- Email summary (optional)
- Push notifications (Android PWA only)

✅ **Authentication**
- Email/password login
- Secure session management via Supabase

✅ **Offline Support**
- Service worker caches app shell
- Offline data entry (syncs when online)
- Works with spotty internet

### Status Logic

Product status is calculated based on days until expiry:

```typescript
function getProductStatus(expiryDate: string): string {
  const today = new Date();
  const expiry = new Date(expiryDate);
  const daysUntilExpiry = Math.floor(
    (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysUntilExpiry < 0) return 'expired';
  if (daysUntilExpiry <= 30) return 'expiring_soon';
  return 'safe';
}
```

### Reminder Date Calculation

```typescript
function calculateReminderDate(expiry: string): string {
  const expiryDate = new Date(expiry);
  const reminderDate = new Date(expiryDate);
  
  // Default: 90 days before
  reminderDate.setDate(reminderDate.getDate() - 90);
  
  // If expiry is < 90 days away, remind 7 days before
  const daysUntilExpiry = Math.floor(
    (expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  
  if (daysUntilExpiry < 90) {
    reminderDate.setDate(expiryDate.getDate() - 7);
  }
  
  // If already past reminder date, set to today
  if (reminderDate < new Date()) {
    return new Date().toISOString().split('T')[0];
  }
  
  return reminderDate.toISOString().split('T')[0];
}
```

---

## 🔔 Notification System

### Supabase Edge Function (Cron Job)

Located at `supabase/functions/send-reminders/index.ts`:

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // Get products where reminder_date = today
  const today = new Date().toISOString().split('T')[0];
  
  const { data: products, error } = await supabase
    .from('products')
    .select('*, users!products_added_by_fkey(email, phone)')
    .eq('reminder_date', today);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
    });
  }

  // Send notifications for each product
  const results = await Promise.all(
    products.map(async (product) => {
      // 1. Send email via Resend
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'Expiro <notifications@expiro.app>',
          to: product.users.email,
          subject: 'Product Expiring Soon',
          html: `<p>${product.name} expires on ${product.expiry_date}</p>`
        })
      });

      // 2. Send SMS via Hubtel
      await fetch('https://sms.hubtel.com/v1/messages/send', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${btoa(`${Deno.env.get('HUBTEL_CLIENT_ID')}:${Deno.env.get('HUBTEL_CLIENT_SECRET')}`)}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          From: 'Expiro',
          To: product.users.phone,
          Content: `${product.name} expires on ${product.expiry_date}`
        })
      });

      // 3. Log notification
      await supabase.from('notifications').insert({
        product_id: product.id,
        type: 'sms',
        status: 'sent',
      });

      return { product: product.name, sent: true };
    })
  );

  return new Response(JSON.stringify({ results }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
```

**Deploy:**
```bash
supabase functions deploy send-reminders
```

**Schedule in Supabase Dashboard:**
- Go to Edge Functions → Cron Jobs
- Schedule: `0 8 * * *` (8am daily)
- Function: `send-reminders`

---

## 🎨 UI Components (Shadcn)

Key components used:

- `Button` - Primary actions
- `Card` - Product list items
- `Input` - Form fields
- `Label` - Form labels
- `Tabs` - Status filters
- `Badge` - Status indicators
- `Alert` - Notifications/errors
- `Dialog` - Modals
- `Calendar` - Date picker

Install components:
```bash
npx shadcn-ui@latest add button card input label tabs badge alert dialog calendar
```

---

## 📂 Project Structure

```
expiro/
├── public/
│   ├── manifest.json          # PWA manifest
│   ├── icon-192.png          # App icon (192x192)
│   └── icon-512.png          # App icon (512x512)
├── src/
│   ├── components/
│   │   ├── ui/               # Shadcn components
│   │   ├── ProductForm.tsx   # Add/edit product
│   │   ├── ProductList.tsx   # List with filters
│   │   └── ProductCard.tsx   # Individual product item
│   ├── lib/
│   │   ├── supabase.ts       # Supabase client setup
│   │   ├── notifications.ts  # Push notification helpers
│   │   └── utils.ts          # Helper functions
│   ├── pages/
│   │   ├── Login.tsx         # Auth page
│   │   ├── Home.tsx          # Product list
│   │   └── AddProduct.tsx    # Product form
│   ├── hooks/
│   │   ├── useProducts.ts    # TanStack Query hooks
│   │   └── useAuth.ts        # Auth state
│   ├── types/
│   │   └── database.ts       # TypeScript types
│   ├── App.tsx
│   └── main.tsx
├── supabase/
│   └── functions/
│       └── send-reminders/
│           └── index.ts      # Notification cron job
├── .env                      # Environment variables
├── vite.config.ts           # Vite configuration
├── tailwind.config.js       # Tailwind configuration
└── package.json
```

---

## 🔧 Development

### Available Scripts

```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Type check
npm run type-check

# Lint
npm run lint

# Format code
npm run format
```

### Adding a Product (Code Example)

```typescript
import { supabase } from '@/lib/supabase';

async function addProduct(data: {
  name: string;
  expiryDate: string;
  photo?: File;
}) {
  // 1. Upload photo if exists
  let photoUrl = null;
  if (data.photo) {
    const fileName = `${Date.now()}_${data.photo.name}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('product-photos')
      .upload(fileName, data.photo);
    
    if (uploadError) throw uploadError;
    
    photoUrl = supabase.storage
      .from('product-photos')
      .getPublicUrl(fileName).data.publicUrl;
  }

  // 2. Calculate reminder date
  const reminderDate = calculateReminderDate(data.expiryDate);

  // 3. Insert product
  const { data: user } = await supabase.auth.getUser();
  
  const { data: product, error } = await supabase
    .from('products')
    .insert({
      name: data.name,
      expiry_date: data.expiryDate,
      reminder_date: reminderDate,
      photo_url: photoUrl,
      added_by: user.user?.id,
    })
    .select()
    .single();

  if (error) throw error;
  return product;
}
```

---

## 🚀 Deployment

### Frontend (Cloudflare Pages)

1. **Connect GitHub Repository**
   - Go to [pages.cloudflare.com](https://pages.cloudflare.com)
   - Click "Create a project"
   - Connect your GitHub account
   - Select the `expiro` repository

2. **Configure Build Settings**
   ```
   Build command: npm run build
   Build output directory: dist
   Root directory: /
   ```

3. **Add Environment Variables**
   - Add all `VITE_*` variables from `.env`

4. **Deploy**
   - Push to `main` branch → auto-deploys
   - Preview deployments on pull requests

### Backend (Supabase)

Already hosted on Supabase. Just need to:

1. **Deploy Edge Functions**
   ```bash
   supabase login
   supabase link --project-ref your-project-ref
   supabase functions deploy send-reminders
   ```

2. **Set Secrets**
   ```bash
   supabase secrets set RESEND_API_KEY=your_key
   supabase secrets set HUBTEL_CLIENT_ID=your_id
   supabase secrets set HUBTEL_CLIENT_SECRET=your_secret
   ```

3. **Enable Cron Schedule**
   - Supabase Dashboard → Edge Functions → Cron Jobs
   - Add cron: `0 8 * * *` (daily at 8am)

---

## 💰 Cost Breakdown

| Service | Free Tier | Usage | Cost |
|---------|-----------|-------|------|
| **Cloudflare Pages** | Unlimited builds & bandwidth | Hosting frontend | **FREE** |
| **Supabase** | 500MB DB, 2GB storage, 2M edge function calls | Database + backend | **FREE** |
| **Resend** | 3,000 emails/month | Email notifications | **FREE** |
| **Hubtel** | Pay-per-use | SMS (~30-60/month) | **$1-2/month** |

**Total: $1-2/month** (SMS only)

---

## 📋 MVP Timeline

### Week 1: Foundation
- ✅ Supabase project setup
- ✅ Database schema
- ✅ Authentication (email/password)
- ✅ Vite + React project

### Week 2: Product Entry
- ✅ Product form with camera
- ✅ Photo upload to Supabase Storage
- ✅ Save product to database
- ✅ Reminder date calculation

### Week 3: Product List
- ✅ List view with status badges
- ✅ Filter tabs (safe/expiring/expired)
- ✅ Product detail view
- ✅ Pull-to-refresh

### Week 4: Notifications
- ✅ Supabase Edge Function
- ✅ Resend email integration
- ✅ Hubtel SMS integration
- ✅ Cron scheduling
- ✅ Notification logging

### Week 5: PWA & Polish
- ✅ Service worker (offline support)
- ✅ PWA manifest
- ✅ Install prompt
- ✅ Testing with real minimart
- ✅ Bug fixes

**Total: 5 weeks to production-ready MVP**

---

## 🔐 Security

### Row Level Security (RLS)

All database tables have RLS enabled:

```sql
-- Only authenticated users can access
CREATE POLICY "Authenticated access"
ON products FOR ALL
TO authenticated
USING (added_by = auth.uid());
```

### Authentication

- Passwords hashed via Supabase Auth
- JWT tokens for session management
- Auto-refresh tokens
- Secure password reset flow

### API Keys

- All secrets stored in environment variables
- Never committed to Git
- Supabase secrets for edge functions

---

## 🐛 Known Limitations

### PWA on iOS
- ❌ No push notifications (iOS Safari blocks PWA push)
- ✅ Works: SMS + email notifications
- ✅ Works: Camera access
- ✅ Works: Offline support
- ✅ Works: Install to home screen

### Offline Support
- Product entry works offline
- Photos cached locally until online
- Sync happens automatically when connection restored

---

## 🔮 Future Enhancements (Post-MVP)

- [ ] Batch product entry (scan multiple at once)
- [ ] Expiry heatmap (visual calendar)
- [ ] Loss reports (track value of expired stock)
- [ ] Discount suggestions for near-expiry items
- [ ] Web dashboard (for managers)
- [ ] Multi-shop support
- [ ] Export to Excel
- [ ] Product categories management
- [ ] Barcode scanning (if proven useful)

---

## 🤝 Contributing

This is a proprietary app for a single minimart. No external contributions accepted.

---

## 📄 License

Proprietary - All rights reserved.

---

## 🆘 Support

For issues or questions:
- Check Supabase documentation: [docs.supabase.com](https://docs.supabase.com)
- Check TanStack Query docs: [tanstack.com/query](https://tanstack.com/query)
- Check Resend docs: [resend.com/docs](https://resend.com/docs)

---

## 🎯 Success Metrics

The app succeeds if:
- ✅ Staff add products daily without friction
- ✅ Notifications arrive reliably before expiry
- ✅ Expired product loss decreases by 50%+
- ✅ Works offline in shop with spotty internet
- ✅ Staff actually use it (adoption = success)

---

**Built with ❤️ to reduce waste and save money for small shops.**
