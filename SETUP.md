# NolleDansa – Kom igång

## Förutsättningar
- Node.js 18+ (rekommenderas, du kör v21 vilket fungerar)
- Ett Supabase-konto (gratis på supabase.com)

---

## 1. Skapa Supabase-projekt

1. Gå till [supabase.com](https://supabase.com) och logga in.
2. Klicka **New project**, välj ett namn (t.ex. `nolledansa`) och ett lösenord.
3. Vänta tills projektet startat.

---

## 2. Kör databasschema

**Nytt projekt (kör aldrig kört något tidigare):**

1. I Supabase-dashboarden, gå till **SQL Editor**.
2. Öppna `supabase_schema.sql` i detta projekt.
3. Kopiera hela innehållet, klistra in och klicka **Run**.
4. Kör sedan även `supabase_migration_v2.sql` på samma sätt.

**Om du redan kört `supabase_schema.sql`:**

Kör bara `supabase_migration_v2.sql` – den lägger till `status`-kolumnen och uppdaterar RLS.

---

## 3. Skapa Storage Bucket

Schemat skapar bucketen automatiskt. Om det misslyckas, gör det manuellt:

1. Gå till **Storage** i Supabase.
2. Klicka **New bucket**.
3. Namn: `dance-videos`, sätt **Public** till `true`.
4. Klicka **Create bucket**.

---

## 4. Aktivera Email Auth (krävs för admin-inloggning)

1. I Supabase, gå till **Authentication > Providers**.
2. Aktivera **Email** (bör vara på som standard).
3. Avaktivera "Confirm email" om du vill slippa e-postbekräftelse vid testning.

---

## 5. Skapa admin-konto i Supabase

1. Gå till **Authentication > Users** i Supabase.
2. Klicka **Add user** → **Create new user**.
3. Fyll i din e-post och ett lösenord.
4. Notera e-postadressen – den ska in i `ADMIN_EMAILS` nedan.

---

## 6. Hämta API-nycklar

1. I Supabase, gå till **Settings > API**.
2. Kopiera:
   - **Project URL** (t.ex. `https://xxxxxxxxxxx.supabase.co`)
   - **anon public key**
   - **service_role key** (håll denna hemlig – används bara server-side)

---

## 7. Skapa `.env.local`

Skapa filen `app/.env.local` med följande innehåll:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

ADMIN_EMAILS=din@email.com
```

- `SUPABASE_SERVICE_ROLE_KEY` används bara i admin-panelen (server-side). Lägg aldrig till `NEXT_PUBLIC_`-prefix på den.
- `ADMIN_EMAILS` är en kommaseparerad lista med e-postadresser som får logga in som admin.

---

## 8. Starta appen lokalt

```bash
cd app
npm run dev
```

Öppna [http://localhost:3000](http://localhost:3000).

---

## 9. Testa uppladdningsflödet

1. Gå till `/upload`.
2. Ladda upp en dans **utan att logga in** – det ska fungera.
3. Du ser en grön bekräftelseskärm: "Tack för uppladdningen – väntar på granskning."
4. Gå till `/admin` och logga in med din admin-e-post och lösenord.
5. Du ser dansen i listan. Klicka in och klicka **Godkänn**.
6. Gå tillbaka till startsidan – dansen syns nu.

---

## Filstruktur

```
app/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                  # Startsida (sökning + trending)
│   ├── upload/page.tsx           # Uppladdning (ingen inloggning krävs)
│   ├── dance/[id]/page.tsx       # Danssida med videospelare
│   ├── admin/
│   │   ├── page.tsx              # Admin-panel (lista pending)
│   │   ├── [id]/page.tsx         # Granska enskild dans
│   │   └── actions.ts            # Server Actions: approve/reject
│   └── api/track-view/route.ts
├── components/
│   ├── Navbar.tsx
│   ├── AuthButton.tsx
│   ├── AdminLoginForm.tsx        # Email/lösenord-formulär för admin
│   ├── DanceCard.tsx
│   ├── SearchBar.tsx
│   ├── TrendingSection.tsx
│   ├── VideoPlayer.tsx
│   ├── SegmentSelector.tsx
│   ├── SegmentForm.tsx
│   ├── UploadForm.tsx
│   └── DanceClient.tsx
├── lib/
│   ├── types.ts                  # Dance, DanceSegment, DanceStatus
│   ├── utils.ts
│   └── supabase/
│       ├── client.ts             # Browser-klient
│       ├── server.ts             # Server-klient (cookie-baserad)
│       ├── admin.ts              # Service role-klient (kringgår RLS)
│       └── auth-helpers.ts       # isAdmin()-funktion
├── supabase_schema.sql           # Initial schema
└── supabase_migration_v2.sql     # Status-kolumn + uppdaterade RLS
```

---

## Uppladdningsflöde (status-system)

| Status | Vad det innebär |
|---|---|
| `pending` | Nyligen uppladdad, väntar på admin-granskning |
| `approved` | Godkänd, visas publikt på startsidan |
| `rejected` | Nekad, visas inte |

**Vad som är synligt för vem:**
- Vanliga besökare: ser bara `approved` danser
- Admin: ser alla status via admin-panelen (service role key kringgår RLS)

---

## Hur segment-loop fungerar

1. Användaren väljer dansdelar (checkboxes) på danssidan.
2. `VideoPlayer` tar emot en lista med valda segment sorterade efter `sort_order`.
3. Vid varje `timeupdate`-event kontrolleras om `currentTime >= segment.end_time`.
4. Om ja, hoppar spelaren till nästa segments `start_time`.
5. När sista segmentet är klart, börjar om från första segmentets `start_time`.
