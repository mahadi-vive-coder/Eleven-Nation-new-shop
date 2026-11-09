# ELEVEN NATION — Customer E-Commerce Website

Official e-commerce customer website for **ELEVEN NATION** (`elevennation.shop`), Bangladesh's premier lifestyle and football culture apparel brand.

> **Brand Tagline**: WEAR YOUR IDENTITY.  
> **Currency**: Bangladeshi Taka (BDT ৳)  
> **Primary Market**: Bangladesh

---

## Architecture Overview

This repository contains **Application 1 — Customer Website**.

- **Public-facing Storefront**: Customers browse products, configure custom jersey printing, add items to a persistent shopping bag, place Cash on Delivery orders, and track consignments.
- **Separate Admin Application**: All back-office operations (adding products, scheduling banners, editing inventory, changing order statuses) will be handled in a completely separate deployment in a future phase.
- **Supabase-Ready**: Built with a decoupled service architecture (`src/services/`). Operates seamlessly in demo mode today and switches to live Supabase queries once environment variables are populated.

---

## Tech Stack

- **Framework**: React 19 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS v4
- **Routing**: React Router v7 (`react-router-dom`)
- **Icons**: Lucide React
- **Animations**: Motion (`motion`)
- **Backend / Database (Ready)**: `@supabase/supabase-js`

---

## Getting Started

### 1. Prerequisites

- Node.js (v18.0 or higher)
- npm or yarn

### 2. Installation

```bash
# Clone the repository
git clone https://github.com/eleven-nation/customer-website.git
cd eleven-nation

# Install dependencies
npm install
```

### 3. Environment Configuration

Copy the template environment file:

```bash
cp .env.example .env
```

Contents of `.env`:

```env
# Optional: Supabase configuration (Leave blank for Demo Mode)
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

### 4. Running Locally

```bash
npm run dev
```

The application will launch at `http://localhost:3000`.

### 5. Building for Production

```bash
npm run build
```

This generates an optimized production bundle inside `/dist`.

### 6. Linting & Type Checking

```bash
npm run lint
```

---

## Key Features

1. **Dynamic Hero Banner Slider**:
   - Reusable multi-banner slider with auto-sliding, pause on hover, mobile touch swipe, and indicator dots.
   - **Strictly one CTA button** (`EXPLORE COLLECTION`) per slide.
2. **23 Canonical Customer Pages**:
   - `/`: Homepage with 9 editorial sections.
   - `/shop`: Full catalog with price, category, size, and color filtering.
   - `/casual-clothing`: Streetwear collection (oversized tees, hoodies, shirts).
   - `/football-jerseys`: Club, national, and retro kits.
   - `/new-arrivals`: Latest seasonal drops.
   - `/featured`: Top-trending pieces.
   - `/product/:slug`: Product detail page with live custom player printing preview.
   - `/cart` & `/checkout`: Cash on Delivery checkout with automatic Dhaka/Outside Dhaka delivery calculation.
   - `/order-confirmation/:orderNumber`: Order confirmation with receipt and celebration.
   - `/track-order`: Public parcel tracking with timeline milestone stepper.
   - `/account`, `/login`, `/register`: Customer portal, address book, and order history.
   - `/about`, `/contact`, `/shipping-policy`, `/returns-policy`, `/faq`, `/privacy-policy`, `/terms`.
   - `/404`: Branded 404 Not Found error page.
3. **Database Documentation Package**:
   - Full SQL schemas and security policies located in `/database/sql/`.
   - Entity Relationship diagram located in `/database/ER_DIAGRAM.md`.

---

## Master Documentation Reference

For exhaustive architecture decisions, data models, and roadmap specifications, consult:

- [`PROJECT_BLUEPRINT.md`](./PROJECT_BLUEPRINT.md) — Master Knowledge Base (32 sections)
- [`SECURITY.md`](./SECURITY.md) — Security Architecture & RLS Specification
- [`CHANGELOG.md`](./CHANGELOG.md) — Version & Feature Release History
- [`database/README.md`](./database/README.md) — Database Overview & Setup Guide
