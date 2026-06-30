# Memos Collage

Animated photo collage website with:

- Endless horizontal card animation (inspired by your reference image)
- Shared gallery for all visitors
- Admin PIN unlock for upload/delete actions
- Image storage on ImgBB API
- Netlify hosting with serverless functions

## Tech stack

- Static frontend: HTML, CSS, JS
- Backend endpoints: Netlify Functions
- Shared metadata storage: Netlify Blobs (`gallery` store)
- Binary image hosting: ImgBB

## Project structure

```
.
|- index.html
|- styles.css
|- script.js
|- netlify.toml
|- package.json
`- netlify/
	 `- functions/
			|- auth-login.js
			|- list-images.js
			|- upload-image.js
			|- delete-image.js
			`- _lib/
				 |- auth.js
				 |- galleryStore.js
				 `- http.js
```

## 1) Prerequisites

- Node.js 18+
- Netlify account + Netlify CLI (`npm i -g netlify-cli`)
- ImgBB API key from https://api.imgbb.com/

## 2) Environment variables (Netlify)

Set these in Netlify Site Settings -> Environment variables:

- `IMGBB_API_KEY` = your ImgBB API key
- `AUTH_SECRET` = long random string for signing admin session tokens
- `ADMIN_PIN_SHA256` = sha256 hash of your admin PIN (recommended)

Optional fallback:

- `ADMIN_PIN` = plain PIN (only if you do not use `ADMIN_PIN_SHA256`)

### Generate `ADMIN_PIN_SHA256`

PowerShell:

```powershell
$pin = "1234"
[System.BitConverter]::ToString(
	[System.Security.Cryptography.SHA256]::Create().ComputeHash(
		[System.Text.Encoding]::UTF8.GetBytes($pin)
	)
).Replace("-", "").ToLower()
```

Copy the output hash into `ADMIN_PIN_SHA256`.

## 3) Local development

Install dependencies:

```bash
npm install
```

Run local site + functions:

```bash
netlify dev
```

Open the printed local URL.

## 4) Deploy to Netlify

If this folder is connected to a Netlify site:

```bash
netlify deploy --prod
```

Netlify reads settings from `netlify.toml`:

- `publish = "."`
- `functions = "netlify/functions"`

## 5) How it works

### Public visitors

- Can view animated collage and all shared uploaded images.
- Cannot upload/delete while locked.

### Admin flow

1. Enter PIN and click Unlock.
2. Frontend calls `/api/auth-login`.
3. If valid, server returns short-lived admin token.
4. Upload/delete requests include `Authorization: Bearer <token>`.

### Upload flow

1. Frontend converts selected file to base64.
2. Calls `/api/upload-image`.
3. Function uploads to ImgBB (`https://api.imgbb.com/1/upload`).
4. Function stores image metadata in Netlify Blobs store `gallery`.

### Delete flow

1. Admin clicks delete on a user-uploaded card.
2. `/api/delete-image` validates token.
3. Function calls ImgBB `delete_url` and removes metadata from Blobs.

## Notes and limits

- ImgBB upload max is 32 MB per image.
- If `delete_url` is unavailable from ImgBB response, image metadata is still removable from gallery store.
- Admin token expires automatically (configured in `netlify/functions/_lib/auth.js`).
- Motion is paused on hover/focus and disabled by `prefers-reduced-motion`.