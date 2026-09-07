# 🗺️ CivicLens — Radical Transparency for Indian Cities

> _"The government built a complaint box. We built a mirror."_

[![React 19](https://img.shields.io/badge/React-19-blue.svg)](https://react.dev/)
[![TanStack Start](https://img.shields.io/badge/TanStack-Start-ff4154.svg)](https://tanstack.com/start)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178c6.svg)](https://www.typescriptlang.org/)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind_CSS-v4-38bdf8.svg)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Database_%26_Realtime-3ecf8e.svg)](https://supabase.com/)
[![Leaflet](https://img.shields.io/badge/Leaflet-OpenStreetMap-199900.svg)](https://leafletjs.com/)
[![Gemini AI](https://img.shields.io/badge/Gemini_AI-Vision_Verification-8e75ff.svg)](https://ai.google.dev/)

**CivicLens** is an open-source, web-first **Public Transparency Layer** built over traditional municipal grievance portals. Instead of burying civic complaints in private administrative backholes, CivicLens publishes every pothole, sewage leak, broken streetlight, and uncollected garbage pile on a **live, real-time public map** — combined with community upvoting and a live **Ward Performance Leaderboard**.

Built for a 24-hour hackathon by students from **VIT Chennai**, engineered specifically for the urban context of **Greater Chennai Corporation (GCC)** and expandable across India's 400M+ urban residents.

---

## 📸 Screenshots & Highlights

|              Live Public Complaint Map               |             Ward Performance Scorecard              |
| :--------------------------------------------------: | :-------------------------------------------------: |
| Color-coded status pins, heatmaps & realtime updates | Live ranking sorted by lowest resolution rate first |

---

## ⚡ The Problem (Chennai Context)

Existing municipal portals like _Namma Chennai (GCC)_, _CMWSSB_, and _1913 Helplines_ suffer from systemic structural failures:

1. **Zero Public Visibility**: Complaints are strictly private tickets. Citizens cannot see neighboring issues, shielding officials from systematic accountability.
2. **Fake Closures & Resolution Fraud**: Field workers upload unrelated/old photos to close tickets artificially before SLAs expire.
3. **Privacy Violations**: Raw phone numbers are forwarded to field staff, exposing citizens to intimidation and pressure to withdraw complaints.
4. **Digital Divide**: Complex OTP gates, app store barriers, and bureaucratic dropdowns restrict usage to ~4% of Chennai's population.

---

## 🚀 The CivicLens Solution

CivicLens acts as a **public mirror**, forcing public accountability without requiring government permission to publish data.
text

              CITIZEN FILES ISSUE
                       │
                       ▼
          LIVE PUBLIC TRANSPARENCY MAP

(Zero-PII • Geotagged • Real-Time Database)
│
┌─────────────────┴─────────────────┐
▼ ▼
COMMUNITY UPVOTES WARD LEADERBOARD
(Device Fingerprinted) (Worst Wards Ranked #1)
│ │
└─────────────────┬─────────────────┘
▼
BEFORE / AFTER PROOF PROTOCOL
(48-Hour Community Fix Verification)

text

---

## ✨ Key Features

### 📍 1. Live Interactive Public Map

- **OpenStreetMap & Leaflet Integration**: Completely free, open-source tile layer requiring zero proprietary API keys.
- **Color-Coded Status System**:
  - 🔴 **Red**: Unresolved
  - 🟡 **Yellow**: In Progress
  - 🟢 **Green**: Verified Resolved
  - 🔴 **Pulsing Red**: SLA Breached (Unattended > 7 Days)
- **Realtime Synchronization**: Powered by Supabase Realtime — filings on one device instantly drop pins on all open maps without page refresh.

### 🛡️ 2. Zero-PII & Privacy-First Architecture

- **No Phone Numbers Stored**: Field staff see only Ticket IDs, categories, descriptions, and GPS locations.
- **Zero OTP Walls**: Instant filing from any browser — elimination of download barriers increases accessibility by 25× compared to native app stores.
- **Local Ticket Registry**: Browser `localStorage` maintains a private "My Filed Issues" drawer for anonymous tracking.

### 🤖 3. AI Vision & EXIF Proof Intake

- **Gemini Vision AI Integration**: Automatically analyzes uploaded photos to filter out invalid uploads (selfies, memes, indoor spaces) and auto-populates category and title fields.
- **EXIF Geotag Verification**: Reads camera GPS & timestamp metadata. Implements a soft-tolerance algorithm (warns on missing/off-target metadata without blocking legitimate reports).

### 🔍 4. Anti-Fraud "Before & After" Proof

- **Dual Evidence Gallery**: Pin popups display both the citizen's **Before** photo and the official's **After (Fix)** photo side-by-side.
- **48-Hour Community Audit**: Resolved tickets remain in "Pending Audit" state for 48 hours. Local residents verify if the fix is real; 2 negative flags reopen the ticket with a public **Resolution Fraud Banner**.

### 📊 5. Ward Performance Leaderboard

- **Political Accountability Ranking**: Ranks 15+ Chennai wards by resolution rate, highlighting **failing wards first**.
- **One-Click Audit PDF**: Generates formal public audit statements formatted for council meetings, press releases, and social media pressure.

---

## 🛠️ Tech Stack

Framework: TanStack Start (React 19 + TypeScript)
Build Tool: Vite 8
Styling: Tailwind CSS v4
UI Components: shadcn/ui (Radix primitives)
Icons: Lucide React
Map Engine: Leaflet.js + React-Leaflet
Map Tiles: OpenStreetMap (Free, open-source)
Database & BaaS: Supabase (PostgreSQL + Realtime WebSockets + Storage)
AI / Computer Vision: Google Gemini Vision API (gemini-2.0-flash)
Image Processing: ExifReader (Client-side EXIF parser)
Notifications: Sonner

text

<img width="1600" height="998" alt="image" src="https://github.com/user-attachments/assets/4e46c093-de9b-441d-85ed-5e4b030442c1" />
<img width="1600" height="789" alt="image" src="https://github.com/user-attachments/assets/bb8456c4-4a9c-4a46-b738-54be98a556b5" />
<img width="1600" height="814" alt="image" src="https://github.com/user-attachments/assets/68d2dab2-1c71-4bda-8712-c7a34891d76c" />

---

## 🗄️ Database Schema Overview

````sql
-- 1. Complaints Table
CREATE TABLE complaints (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  sub_type TEXT,
  landmark TEXT,
  latitude DECIMAL(10, 7) NOT NULL,
  longitude DECIMAL(10, 7) NOT NULL,
  status TEXT DEFAULT 'Unresolved' CHECK (status IN ('Unresolved', 'In Progress', 'Resolved', 'Pending Audit')),
  upvote_count INT DEFAULT 0,
  user_name TEXT,
  photo_url TEXT,         -- Before Photo
  fix_photo_url TEXT,     -- After Photo
  area TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

-- 2. Upvotes Table (Anti-Spam Fingerprinting)
CREATE TABLE upvotes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  complaint_id UUID REFERENCES complaints(id) ON DELETE CASCADE,
  voter_fingerprint TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(complaint_id, voter_fingerprint)
);

-- 3. Wards Table
CREATE TABLE wards (
  id SERIAL PRIMARY KEY,
  ward_name TEXT UNIQUE NOT NULL,
  councillor_name TEXT,
  open_count INT DEFAULT 0,
  resolution_rate INT DEFAULT 0,
  avg_days INT DEFAULT 0,
  sla_breaches INT DEFAULT 0
);
📦 Local Installation & Setup
Prerequisites
Node.js: v18.0.0 or higher
npm or bun
Supabase Project: Free tier account at supabase.com
1. Clone the Repository
Bash

git clone https://github.com/your-username/civiclens.git
cd civiclens
2. Install Dependencies
Bash

npm install
3. Environment Variables Setup
Create a .env.local file in the root directory:

env

VITE_SUPABASE_URL=https://your-supabase-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_GEMINI_API_KEY=your-google-gemini-api-key
Important: Do NOT append /rest/v1 to VITE_SUPABASE_URL.

4. Database Setup
Open Supabase Dashboard → SQL Editor.
Run the schema migrations (including storage.buckets configuration for complaint-photos).
Enable ALTER PUBLICATION supabase_realtime ADD TABLE complaints;.
5. Run Development Server
Bash

npm run dev
Open http://localhost:5173 in your browser.

🗺️ Roadmap & Phase Model
 Phase 1: MVP / Public Mirror (Current)
Real-time public map, zero-PII anonymous filing, community upvoting, Gemini AI vision intake, before/after evidence photos, ward performance dashboard, PDF audit generator.
 Phase 2: Official Integration Layer (Post-Hackathon)
Dedicated municipal officer workspace with geofenced zonal ticket routing, WhatsApp submission bridge, multi-language support (Tamil / English), and automated council digest emails.
👥 Team CivicLens (VIT Chennai)
Karwin S.C (25BCE1682) — Full-Stack Development, Map Architecture & Database
Adhavan (25BCE1144) — Backend Strategy & Database
Aryan Nama (25MID1157) — Research & Civic Strategy
Arjith (25BEC1209) — UI/UX Design & Systems
📄 License
Distributed under the MIT License. See LICENSE for more information.

<p center="align"> <b>CivicLens</b> · Built for Radical Transparency in Indian Cities 🇮🇳 </p> ```
````
