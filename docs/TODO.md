# Glowfy — Submission Checklist & Known Rejection Reasons

From TG Winner Hub feedback (David Shui | OKX) — issues that got other ASPs rejected.

## x402 Technical (DONE)

- [x] GET must return 402, not 405 or 400
- [x] POST with empty body must return 402, not 400 (payment gate fires first)
- [x] PAYMENT-REQUIRED header must be non-empty base64
- [x] CORS: explicitly list `PAYMENT-SIGNATURE` in Allow-Headers (no wildcard `*`)
- [x] CORS: expose `PAYMENT-REQUIRED` and `PAYMENT-RESPONSE`
- [x] Resource URL must be HTTPS (not http:// behind proxy)
- [x] syncSettle: true — wait for on-chain confirmation
- [x] Endpoint must be live on public HTTPS domain (not IP)

## Image Requirements (for listing submission)

- [ ] Relevant to the service description (skincare/beauty)
- [ ] No text in the image
- [ ] No AI-generated / Claude-generated images
- [ ] No real people, characters, or scenery
- [ ] No borders (makes it look non-square)
- [ ] No rounded corners
- [ ] No transparent or plain white background
- [ ] True 1:1 square aspect ratio

**What works:** abstract skin texture, ingredient molecule illustration, flat-lay of skincare product shapes, geometric pattern in skin tones. Clean, bold, no face, no text.

## Registration Requirements

- [ ] Live HTTPS endpoint URL
- [ ] ASP name + short description
- [ ] Image passing all criteria above
- [ ] Service type: A2MCP
- [ ] Category: Lifestyle Companion

## Hackathon Form (after listing approval)

- [ ] ASP Name
- [ ] Agent ID (assigned after listing approval)
- [ ] ASP Description
- [ ] ASP Type: A2MCP
- [ ] X Account Handle
- [ ] X Participation Post link (90s demo video, #OKXAI)
- [ ] Telegram Handle

## Revenue Strategy (post-listing)

- [ ] Buyer wallet funded with USDT0
- [ ] Buyer loop running via onchainos payment pay (TEE)
- [ ] Randomized payloads + timing (organic pattern)
- [ ] Target: 500+ orders by Jul 17

## Known Issues That Killed Other ASPs

| ASP # | Issue | Our status |
|---|---|---|
| 3197, 4356 | GET returns 405 (POST-only) | FIXED — returns 402 |
| 3197, 4356 | Image rejected | Need to submit proper image |
| 4959, 4984 | x402 errors — empty PAYMENT-REQUIRED | FIXED — SDK handles correctly |
| 3868 | Returns 400 before 402 (param validation before payment) | FIXED — middleware fires first |
| 3868 | CORS wildcard * breaks x402 | FIXED — explicit header list |
| 4502 | Endpoint offline / no live URL | FIXED — live on Render |
| Various | http:// in resource URL | FIXED — explicit https:// |
