# NolleDansa – Self-host setup (PostgreSQL + Authentik + MinIO)

## 1. Förutsättningar
- Node.js 20+
- PostgreSQL 15+
- Authentik (OIDC provider) med en klient för appen
- MinIO (S3-kompatibel bucket)

## 2. Initiera databasen
Kör SQL-filen i din PostgreSQL-databas:

```bash
psql "$DATABASE_URL" -f db/schema.sql
```

## 3. Konfigurera Authentik
Skapa en OIDC-klient i Authentik och sätt callback till:

```
http://localhost:3000/api/auth/callback/authentik
```

Använd samma `issuer`, `client_id`, `client_secret` i miljövariablerna nedan.

## 4. Konfigurera MinIO
Skapa en bucket (t.ex. `dance-videos`) och ett access key-par med read/write.

## 5. Skapa `.env.local`

```env
DATABASE_URL=postgres://user:password@localhost:5432/nolledansa

AUTH_SECRET=replace-with-a-random-secret
AUTH_URL=https://nolledansa.dsek.se
AUTH_TRUST_HOST=true
AUTHENTIK_ISSUER=https://auth.example.com/application/o/nolledansa/
AUTHENTIK_CLIENT_ID=...
AUTHENTIK_CLIENT_SECRET=...

S3_ENDPOINT=http://localhost:9000
S3_REGION=us-east-1
S3_BUCKET_NAME=dance-videos
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...
S3_FORCE_PATH_STYLE=true
S3_PUBLIC_URL=http://localhost:9000/dance-videos
```

## 6. Installera och starta

```bash
npm install
npm run dev
```

Öppna `http://localhost:3000`.

## 7. Admin
Admin-login sker via Authentik på `/admin`.
Behörighet styrs helt via Authentik-policy för applikationen.
