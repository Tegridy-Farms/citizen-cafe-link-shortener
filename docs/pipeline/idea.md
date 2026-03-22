# Citizen Cafe TLV Link Shortener

## Overview
A minimal link shortener for Citizen Cafe TLV company.

## Frontend
- Single page, minimal design
- Must follow Citizen Cafe branding (see branding guide)
  - Colors: #FFE300 (yellow), #FFFFFF (white), #373230 (charcoal)
  - Typography: Fedra for headlines, Assistant for body/UI
  - Logo: Use official Citizen Cafe logo assets

## Backend API
### Protected Route: POST /api/shorten
Receives:
```json
{
  "url": "https://hook.integromat.com/p1va3atuv11nutrergq579t3we6wn37c?pid=1176&dealid=167518",
  "key": "****"
}
```

Returns:
```json
{
  "url": "https://<verceldomain>/G4SFwQmza66z"
}
```

## Requirements
- URL shortening with unique short codes
- Protected API endpoint (key authentication)
- Redirect from short URL to original URL
- Citizen Cafe branding on frontend
- Deploy to Vercel
