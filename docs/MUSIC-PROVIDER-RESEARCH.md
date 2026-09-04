# Music Provider Research

> **Design notes** — internal research from early development on which music
> provider to build on (kept for context; Spotify won).

**Date:** 2026-04-18
**Status:** Research complete; recommendation pending product decision
**Question:** Can Buzz's "Guess the Song" mode legally and technically scale beyond a single Spotify user, and if so under what business model and which provider?

---

## TL;DR

- **No major streaming provider permits a commercial music-quiz desktop app on self-serve terms.** Spotify, Apple Music, Amazon Music, and Deezer each block the use case via at least one of: explicit content-type ban, commercial-sale prohibition, indirect-monetization clause, or absence of a viable third-party playback API.
- **YouTube (Data API + IFrame Player) is the only API path that survives the policy filter** — but only at the cost of a UX redesign (visible video, no overlays, ≥200×200px player, no audio-only mode) and within a 10,000 units/day shared-key quota.
- **A "Hitster pattern" (no API at all — Buzz hands off URIs to the user's installed music app)** is the only architecture that doesn't depend on any provider saying yes. It costs the pause-on-buzz mechanic, which the team has judged unacceptable.
- **The pragmatic ship-it path is open-source non-profit + BYO-client-id**: each user registers their own Spotify Developer app, accepts the 5-user-per-app cap, and individually assumes the Policy III.2 risk. This is how most existing Spotify-integrated quiz hobby projects on GitHub already operate.
- **A commercial product remains unreachable** without either (a) a negotiated Spotify partnership (Hitster precedent — months/years, requires entity + scale), or (b) a fundamental product redesign away from any quiz mechanic on streamed audio.

---

## 1. Context

### 1.1 What Buzz is today

Buzz is a Tauri v2 + React/TypeScript desktop quiz buzzer game. The "Guess the Song" mode plays music while players race to buzz in. The current Spotify integration:

- OAuth 2.0 PKCE, client-side only. Each host enters their own Client ID on first launch (stored in localStorage). No backend.
- Tokens persisted in `localStorage`.
- Spotify Web Playback SDK for in-browser playback.
- Hand-rolled REST client against `https://api.spotify.com/v1` for playlists/tracks.
- Scopes: `streaming`, `user-read-private`, `user-read-email`, `playlist-read-private`.
- Redirect URI: `http://127.0.0.1:8080/callback`.
- Each host brings their own Spotify Premium account.

A known runtime issue surfaced in the DRM/rate-limiting research notes: the Web Playback SDK's internal Widevine DRM license endpoint returns 429 after ~7 fast track changes per account, with `Retry-After` values up to several hours.

### 1.2 The scaling question

Buzz today is a one-person hobby project. The original product ambition was to grow it into a commercial desktop product sold to thousands of independent users (each bringing their own music subscription). This research evaluates:

1. Whether the current Spotify integration scales to a commercial multi-user product.
2. Whether alternative providers (Apple Music, YouTube/YouTube Music, Deezer, Amazon Music) offer better commercial paths.
3. Whether business-model changes (free app + hardware revenue, Hitster pattern, open-source non-profit) change the legal viability.

---

## 2. Spotify — current provider

### 2.1 Three independent commercial blockers

Any one of these is sufficient to prevent a commercial Buzz product on Spotify. All three apply.

#### Blocker 1: Explicit content-type ban

**Spotify Developer Policy §III.2** (effective 15 May 2025) states verbatim:

> "Do not create a game, including trivia quizzes."

**Spotify Compliance Tips** names the pattern explicitly:

> "Incorporating Spotify into any gaming or quiz functionality. For example, a 'name that tune' quiz would not be allowed."

This is not a money clause. It is a content-type ban that applies regardless of whether Buzz is sold, free, or open source.

#### Blocker 2: Streaming SDA commercial-sale prohibition

**Developer Policy §IV** prohibits:

> "the sale, whether integrated or as a standalone product, of a Streaming SDA, the Spotify Platform, Spotify Content"
> "any e-commerce (e.g., in-app payment or monetization) initiated via a Streaming SDA"
> "the sale of advertising, sponsorships, or promotions on the Streaming SDA itself"

A "Streaming SDA" is any app that streams Spotify audio via the Web Playback SDK — which Buzz is. Selling Buzz violates this clause directly.

#### Blocker 3: February 2026 Dev Mode tightening + unreachable Extended Quota

Spotify's 6 Feb 2026 platform-security update lowered the Dev Mode user cap from 25 to **5 authorized users per Client ID**, effective 11 Feb 2026 for new apps and 9 Mar 2026 for existing apps. The app owner must also hold an active Spotify Premium subscription. If it lapses, the app stops working for all 5 users.

Extended Quota (the only path beyond 5 users) requires (per the 15 Apr 2025 criteria update):

- Legally registered business entity
- Active, launched service
- ≥250,000 monthly active users
- Availability in key Spotify markets
- "Commercial viability"
- Adherence to Developer Terms

Spotify publicly states that **>95% of Extended Quota applications are rejected**. Individuals have been ineligible since 15 May 2025.

This creates a chicken-and-egg situation: a commercial Buzz cannot legally exist below 250k MAU (no quota path) and cannot reach 250k MAU while capped at 5 users.

### 2.2 Other findings from the Spotify research

- **Rate limits are per-app (per Client ID)**, not per-user. A single shared Client ID across thousands of installs draws from one budget — a structural scaling problem independent of the policy bans.
- **Web Playback SDK GitHub repo has been archived since 29 June 2020.** The Widevine DRM 429 issue is undocumented, unfixed, and per the Feb 2026 announcement Spotify is tightening, not opening, developer access.
- **Refresh tokens under PKCE are single-use and rotate** on every refresh. Race conditions on token writes can force re-authentication.
- **Hitster** (commercial board game using Spotify QR codes) appears to operate under a **bespoke commercial agreement** — not a self-serve approval path.

### 2.3 Verdict for Spotify

**Unviable for a commercial product.** Workable for a personal hobby/non-profit deployment within the 5-user cap. The cleanest pattern for that case is documented in §7.4 below.

---

## 3. Alternative providers

All four alternatives were researched against the same 30-point rubric covering playback, library/metadata, auth, licensing, scale, cost, geography, technical fit, and future-proofing. Source URLs and detailed scoring are preserved in the per-provider research conducted on 2026-04-17.

### 3.1 Apple Music (MusicKit)

**Verdict: Unviable for commercial; technically broken on Linux/Windows in Tauri.**

The Apple Developer Program License Agreement (ADPLA) §3.3.6.D states:

> "You agree not to require payment or indirectly monetise access to the Apple Music service (e.g. in-app purchase, advertising, requesting user info) through Your use of the MusicKit APIs, MusicKit JS or otherwise in any way."

The phrase "or otherwise in any way" plus a non-exhaustive example list makes this the broadest indirect-monetization clause among the five providers. Selling Buzz, or selling complementary hardware that the app pairs with, would both fall inside Apple's likely reading.

The same section adds two further restrictions:

> "users must initiate playback and be able to navigate playback using standard media controls"

> "MusicKit Content cannot be synchronised with any other content"

A quiz UI overlaying timers and reveals on synchronized playback runs against the synchronization clause. Auto-advancing rounds run against the "users must initiate playback" clause.

**Technical issues independent of policy:**

- **MusicKit JS uses FairPlay DRM.** Tauri's webviews:
  - **macOS (WKWebView):** FairPlay supported. Works.
  - **Windows (WebView2):** Chromium uses Widevine, not FairPlay. Cider (Electron-based) ships a bespoke Widevine shim with ongoing problems. Tauri's WebView2 has no Widevine at all.
  - **Linux (WebKitGTK):** No FairPlay, no Widevine without a manual proprietary CDM blob. Effectively non-functional.
- **Music User Tokens** have no documented refresh endpoint and invalidate on Apple ID password change.
- **Vendor cost:** $99/year Apple Developer Program membership to sign developer tokens. Per-host cost is each user's Apple Music subscription.

**Strengths (irrelevant given the blockers):** No Spotify-style 250k-MAU gate. Catalog covers all target markets. Rate limits are per-user, not per-app.

### 3.2 YouTube Data API v3 + IFrame Player API

**Verdict: Marginal. The only API path that survives the policy filter — at the cost of a substantially different UX.**

Two paths were evaluated:

- **Path 1 — YouTube proper:** Public YouTube Data API for search/metadata + YouTube IFrame Player API for embedded video playback. Plays full music videos. Free, quota-based. Ads served unless the host has YouTube Premium.
- **Path 2 — YouTube Music:** **No official public API in 2026.** Unofficial Python libraries (`ytmusicapi`) scrape the web client. Shipping that in any released product violates YouTube's ToS prohibition on downloading and on creating substitute services. Unviable.

**Path 1's policy advantages:**

- No "no quizzes" clause in the YouTube Developer Policies.
- Commercial sale of API clients is permitted.
- No 250k-MAU-style commercial gate.

**Path 1's policy constraints (from the YouTube API Services Developer Policies):**

- "You must not separate, isolate, or modify the audio or video components" — forbids the classic "hide the video, play audio only" music-quiz pattern.
- "must not display overlays, frames, or other visual elements in front of any part of a YouTube embedded player, including player controls" — forbids countdown/reveal overlays drawn on top of the player.
- "must not create, include, or promote features that play content from a background player" — player must remain visible.
- "must not modify, build upon, or block any portion or functionality of a YouTube player" — rules out hiding ads.
- Player must be ≥200×200 px.

A Heardle-style hidden-audio quiz is non-compliant in three places at once. A "watch the video, players guess the song" quiz with the player as the centerpiece would be compliant — a substantively different game.

**Quota math:**

- Default allocation is 10,000 units/project/day, resetting at midnight Pacific Time.
- `search.list` costs 100 units; most other `.list` reads cost 1 unit.
- On a single shared Client ID across all installs, 10k units/day = ~100 searches/day across the entire installed base, or ~10,000 metadata reads/day.
- Quota extensions are granted via Google's Audit form (privacy policy + ToS + video walkthrough + business justification required). No published approval rate; reports of weeks of review and frequent denials.

**Other considerations:**

- Hosts without YouTube Premium see pre-roll ads that cannot be skipped programmatically. Breaks quiz timing.
- Music-video catalog is broad but **video-shaped, not track-shaped**: artist/album metadata is inconsistent outside "Topic"/Official Artist Channels.
- Catalog stability is weaker than dedicated music services — videos get geo-blocked, deleted, or made private without notice.

### 3.3 Deezer

**Verdict: Unviable. No supported third-party playback path exists at all, and the ToS is the most restrictive of the five.**

A timeline of Deezer's withdrawal from third-party developer playback:

- **Feb 2023:** Deezer staff confirms on the Community forum that "the API can't be used for playback, only for metadata retrieval. We don't provide a public way to play tracks anymore for individuals."
- **Dec 2022 – Dec 2024:** Multiple staff confirmations that the JavaScript SDK (`DZ.player`) is "not supported anymore and is not available anymore."
- **14 May 2025:** Developer FAQ confirms "our Native SDK has been deprecated and Deezer no longer supports it."
- **19 May 2025:** Deezer Connect (the only remote-control surface that might have been a workaround) reaches End of Life.
- **27 Dec 2024:** Staff response to developers asking for a replacement: "no updates so far."

**Developer Terms §IV** is the strictest commercial clause among all five providers:

> "The Developer agrees that the use of the Services is strictly limited for a non-commercial purpose and in a non-commercial environment."

> "the Developer shall not perceive, receive, generate, benefit or create directly or indirectly, any moneys, incomes, revenues, data or any other consideration"

The "directly or indirectly... any moneys, incomes, revenues, data or any other consideration" phrasing catches every monetization model — direct sale, indirect sale (hardware revenue), even data collection.

**Other issues:** OAuth flow uses a confidential client (client secret required for token exchange). For a distributed desktop app, the secret would either leak (embedded) or require a backend (contradicts Buzz's local-only architecture). PKCE is not documented as supported.

**Strengths (irrelevant given the playback gap):** Strong EU presence and 90M+ track catalog. Operates in 185+ countries.

### 3.4 Amazon Music

**Verdict: Unviable. Closed-beta API + two simultaneous explicit ToS bans.**

Amazon Music does publish a Web API at `developer.amazon.com/docs/music/`, but the program overview page states:

> "These Amazon Music APIs are currently in a closed Beta. Please check back soon for updates."

> "Access to the APIs will be limited until the implementation is validated and approved by Amazon Music."

Community reports through 2025 indicate the beta slot pool has been full, with Amazon Dev Relations referencing "mid-2025" expansion that has not materialized.

The **Amazon Music Program Requirements** contain two clauses that each independently kill Buzz:

> "incorporate Amazon Music Service content into a game experience, including trivia quizzes" — prohibited

> "you will not charge any fees to any end user for access to or use of the Amazon Music Service"

The first is the same explicit content-type ban as Spotify's III.2. The second is one of the broader monetization bans — even free-app + hardware revenue would be at risk under Amazon's enforcement.

**Technical issues independent of policy:** Streaming requires Widevine DRM (hardware-preferred). The Widevine integration requires a separate license from Google as a Widevine licensee. Tauri webview Widevine support is inconsistent across platforms (especially Linux). Even if approved into the beta, the integration is not webview-friendly.

**Other paths considered and rejected:**

- **Amazon Music for Artists** is an artist-side analytics property, not a consumer playback API.
- **Alexa Music Skill API** lets a music provider publish their catalog into Alexa, not the inverse. Wrong direction.
- **No `amazonmusic://` URL scheme** for opening specific tracks on the desktop client is publicly documented.

---

## 4. Cross-cutting findings

Patterns that became clear when comparing all five providers:

### 4.1 Music quizzes are systematically locked out

- **Spotify:** Explicit ban (Policy §III.2; Compliance Tips names "name that tune").
- **Amazon Music:** Explicit ban ("incorporate Amazon Music Service content into a game experience, including trivia quizzes").
- **Apple Music:** No explicit quiz ban, but the synchronization clause + "users must initiate playback" clause + indirect-monetization clause cover the same ground in practice.
- **Deezer:** No explicit quiz ban, but the blanket non-commercial clause covers any commercial quiz.
- **YouTube:** No quiz ban — and consequently the only viable API path.

The pattern is not coincidental. Streaming providers do not want their catalog used as game inputs for products they don't control or monetize.

### 4.2 Commercial-sale bans are the bigger blocker than the quiz mechanic itself

For Apple, Deezer, Amazon, and Spotify, **commercial sale of an app that streams the provider's catalog is restricted regardless of the app's content**. Even if Buzz were a music player rather than a quiz, three of the four would block paid sale via "indirect monetization" or "non-commercial only" clauses.

### 4.3 The Hitster pattern is the only architecture the entire industry tolerates

Because it never touches the API. Hitster ships physical board games with QR codes that open the user's installed Spotify app — no API surface, no auth, no ToS engagement. Every provider tolerates this because they have no contractual relationship to enforce against.

### 4.4 Provider-side trends are tightening, not loosening

- **Spotify:** Feb 2026 tightening (5-user cap, owner-must-have-Premium); 2024 deprecations (preview URLs, several metadata endpoints).
- **Deezer:** Three withdrawals in 2.5 years (JS SDK, Native SDK, Connect).
- **Apple:** ADPLA revised annually with §4 unilateral-change clause.
- **Amazon:** Closed beta has been "full" for years.
- **YouTube:** Most stable of the five, but recent OAuth migrations and the "API wrapper apps" enforcement signal tightening.

The trajectory across the industry is in the wrong direction for third-party music apps.

---

## 5. Business-model variations explored

### 5.1 Commercial paid app

Original ambition: sell Buzz as a paid desktop product, hundreds-to-thousands of users.

**Outcome: Unviable on every provider except YouTube (with substantial UX redesign).**

Spotify, Apple, Amazon, and Deezer all block this directly. YouTube permits it but constrains the UX to visible-video, no-overlays, no-audio-only — a meaningfully different game.

### 5.2 Free app + hardware revenue (dropshipped buzzers)

Variant explored: Buzz becomes a free download. Revenue comes from selling matching hardware buzzers separately.

**Outcome: Helps for some providers, doesn't fix the binding constraints.**

| Provider     | Was      | Now (free app + hardware)             | Reason                                                                                 |
| ------------ | -------- | ------------------------------------- | -------------------------------------------------------------------------------------- |
| Spotify      | Unviable | Still unviable, partnership-pitchable | 5-user cap + quiz ban remain; monetization story improves; closer to Hitster precedent |
| Apple Music  | Unviable | Still unviable                        | "Or otherwise in any way" indirect-monetization clause catches hardware tying          |
| Amazon Music | Unviable | Still unviable                        | Explicit "no trivia quizzes" content ban is independent of money                       |
| Deezer       | Unviable | **More clearly unviable**             | "Directly or indirectly, any moneys" catches hardware revenue                          |
| YouTube      | Marginal | Marginal                              | Was already commercial-OK; not the binding constraint                                  |

The takeaway: **money was never the only objection.** Removing direct sale of Buzz removes some clauses but leaves the content-type bans, the engineering caps, and the broadest "indirect" clauses intact.

The one place this model genuinely strengthens the case is **as a Spotify BD pitch.** "Free open-source app + branded buzzers" mirrors Hitster's model closely enough that the partnership conversation becomes more plausible — though still entirely dependent on Spotify saying yes, which is not under our control.

### 5.3 Hitster pattern — no API at all

Variant explored: Buzz never authenticates with any music service, never makes API calls. Each track is stored as a URI (`spotify:track:abc`, Apple Music link, YouTube Music link). When a round starts, Buzz tells the OS to open the URI; the user's installed music app launches and plays the track. Buzz times the round locally and tracks scores.

**Outcome: Architecturally clean for the commercial path. Rejected on gameplay grounds.**

The mechanical comparison vs. the previously-rejected Connect remote-control path (Task 1 in the Spotify technical-cleanup plan):

| Dimension           | Task 1: Connect remote-control       | Hitster: open-URI                                                |
| ------------------- | ------------------------------------ | ---------------------------------------------------------------- |
| API usage           | Spotify REST player endpoints        | None                                                             |
| Auth                | OAuth PKCE + tokens                  | None                                                             |
| Pause-on-buzz       | HTTP→cloud→device (~500ms)           | **Cannot pause automatically** — host pauses manually or doesn't |
| State knowledge     | Polled every ~1.5s                   | **Zero**                                                         |
| Skip / next track   | API call from Buzz                   | Buzz fires next URI; user's app handles it                       |
| Device discovery UX | "Pick a Spotify device" picker       | "Make sure your music app is open"                               |
| Code surface        | Net-new adapter + polling + fallback | **Whole `spotify/` package goes away**                           |
| Multi-provider      | Spotify only                         | Yes — works with any service                                     |
| Free-tier users     | Still need Premium                   | Works for free users in their own app                            |
| ToS exposure        | Same as today                        | **None**                                                         |
| Linux               | Works                                | Works                                                            |
| Commercial path     | Still blocked                        | Clean                                                            |

The dealbreaker is **pause-on-buzz.** When a player buzzes, Buzz cannot pause the audio because it has no channel to the user's music app. The three workarounds (accept audio bleed, mask with a buzz sound effect, instruct host to hit a global pause shortcut) were judged unacceptable for a buzzer-driven quiz game. Hitster the board game gets away with this because it has no buzz-to-interrupt mechanic — songs just play for a fixed clip length.

Note that Task 1's rejection logic does not carry over to Hitster: Task 1 was rejected for _doubling surface area in a single-user app where the SDK works today_. Hitster _replaces and shrinks_ the surface, and is being evaluated for the commercial pivot — different problem, different trade-off. But the gameplay objection ends both paths.

### 5.4 Open-source non-profit (BYO client_id)

Variant explored: Buzz published as open-source on GitHub. No money, no hardware sales, no commercial intent. Each user registers their own Spotify Developer app and pastes the Client ID into Buzz.

**Outcome: Lowest-risk way to publish the project. Technically still violates Spotify Policy §III.2, but enforcement risk against a hobby-scale BYO project is minimal.**

What changes when going non-commercial open-source:

| Restriction                                            | Resolved?                                       |
| ------------------------------------------------------ | ----------------------------------------------- |
| Streaming SDA cannot be sold                           | ✅ No sale                                      |
| No e-commerce via SDA                                  | ✅ Resolved                                     |
| No advertising/sponsorships                            | ✅ Resolved                                     |
| Extended Quota requires 250k MAU + business            | ✅ Stays in Dev Mode                            |
| **Policy III.2: "no games, including trivia quizzes"** | ❌ **Still applies**                            |
| **Feb 2026: 5 authorized users per Client ID**         | ❌ **Still applies — hard ceiling per install** |
| Privacy Policy URL required                            | ❌ Still required                               |
| Spotify branding rules                                 | ❌ Still required                               |

**Why BYO-client-id minimizes risk:**

- Each user is the contractual party with Spotify, not the Buzz project.
- Each user's personal Dev Mode app authorizes themselves + 4 friends — sufficient for a personal hobby quiz.
- The Buzz repo distributes source code, not a binary with someone's Client ID baked in. Source code does not by itself violate Spotify's terms.
- The pattern matches how most existing Spotify-integrated quiz hobby projects on GitHub already operate. Spotify enforcement against individual hobbyists is essentially nonexistent in observed practice.

**Realistic enforcement risk:**

- Likelihood Spotify ever notices: very low (no commercial visibility).
- Likelihood of action if noticed: low — most likely outcome is a takedown request or revocation of users' personal dev apps.
- Worst case: Spotify revokes individual users' Client IDs and the integration stops working. No fines, no lawsuits, just a dead feature.

---

## 6. Decisions taken during this research

For traceability, the following decisions were made and recorded during the research:

- **2026-04-17:** Initial scope defined — Spotify policy, auth, rate limits, costs, technical dependencies, scalability. Excluded alternatives.
- **2026-04-17:** Commercial product confirmed as the original target. Drove the focus on Extended Quota, Developer Terms, branding compliance.
- **2026-04-17:** First research wave (4 parallel agents) returned. Spotify confirmed unviable for commercial; three independent blockers documented.
- **2026-04-17:** Created a Spotify technical-cleanup plan covering technical improvements that apply regardless of commercial outcome.
- **2026-04-18:** Task 1 (Spotify Connect remote-control) in that plan formally rejected for reasons documented in-line.
- **2026-04-18:** Task 3 (move tokens to OS keychain) postponed. Documented reasoning in-plan.
- **2026-04-17:** Alternatives research scope confirmed: Apple Music, YouTube/YouTube Music, Deezer, Amazon Music. Tidal, SoundCloud, Bandcamp explicitly out of scope.
- **2026-04-17:** Local MP3 baseline (no streaming service) ruled out as infeasible — cannot acquire a sufficient track library.
- **2026-04-18:** Second research wave (4 parallel agents) returned. All four alternatives confirmed unviable for commercial; YouTube only with substantial UX redesign.
- **2026-04-18:** Free-app + hardware-revenue model evaluated. Helps Spotify commercially-pitchable, doesn't fix engineering caps or content-type bans elsewhere.
- **2026-04-18:** Hitster pattern (open-URI, no API) evaluated. Rejected on the pause-on-buzz gameplay constraint.
- **2026-04-18:** Open-source non-profit + BYO-client-id confirmed as the realistic publication path.

---

## 7. Recommendation and ship path

### 7.1 Recommended path: open-source non-profit, BYO-client-id

Given that:

- The commercial product is not reachable on any provider without a negotiated partnership.
- The Hitster pattern is technically clean but gameplay-incompatible.
- The current Spotify integration works for a hobby-scale audience.
- The team's stated goal is to make Buzz available, not to make money from it.

The recommended ship path is to publish Buzz as an open-source non-profit project with each user supplying their own Spotify Client ID.

### 7.2 What this requires

A contained set of changes from the current architecture:

1. **Remove the embedded `VITE_SPOTIFY_CLIENT_ID`** from the build. Replace with a setup-screen field where users paste their own.
2. **Persist the user's Client ID** alongside the existing token storage.
3. **Add README documentation** walking users through registering a personal Spotify Developer app (the 4 dashboard steps).
4. **Add a clear disclaimer** in the README and the in-app setup screen: Spotify's Developer Policy currently prohibits music-quiz apps; users assume the risk under their own Client ID.
5. **Publish a Privacy Policy** (a one-page GitHub Pages doc — Buzz stores tokens locally and sends nothing to a backend).
6. **Avoid Spotify trademarks** in the project name, app icon, or marketing.
7. **Comply with Spotify branding rules** for the in-app "Connect with Spotify" button and any track-metadata display.
8. **Source-only releases**, or releases that prompt for a Client ID on first run. Do not distribute binaries with a baked-in Client ID at scale.
9. **Choose an OSI-approved license** (MIT, Apache-2.0, GPL — open question).

The technical-cleanup work from the Spotify technical-cleanup plan (Tasks 2, 4, and any others not postponed) carries over independently.

### 7.3 What this gives up

- **Commercial revenue from Buzz itself.** No paid app, no hardware revenue tied to the app.
- **Smooth onboarding.** New users have to create a Spotify Developer account and copy a Client ID. This is a real friction step.
- **Reach beyond hobby scale.** Each installation maxes out at 5 Spotify users. Buzz becomes "for me and my friends," not "for thousands."
- **Long-term certainty.** Spotify could enforce III.2 against the project at any time. Most likely outcome is takedown, not legal action.

### 7.4 Revisit if

- Spotify reverses the Feb 2026 tightening or relaxes the III.2 quiz prohibition.
- A Spotify commercial partnership becomes a concrete conversation (Hitster precedent).
- The product pivots away from quiz mechanics on streamed audio.
- A new music provider emerges with developer-friendly terms for game/quiz use cases.
- The team's commercial ambition returns and a pivot to one of: (a) Hitster pattern with a redesigned non-buzz-interrupting game mode, or (b) YouTube Path 1 with a visible-video UX, becomes acceptable.

---

## 8. Source material

Research was conducted on 2026-04-17 and 2026-04-18 via parallel research agents. All claims in this report are sourced from the agent outputs preserved in conversation history. Primary public sources cited across the research:

**Spotify:**

- [Developer Policy](https://developer.spotify.com/policy)
- [Developer Terms](https://developer.spotify.com/terms)
- [Compliance Tips](https://developer.spotify.com/compliance-tips)
- [Quota Modes documentation](https://developer.spotify.com/documentation/web-api/concepts/quota-modes)
- [Updating the Criteria for Web API Extended Access (15 Apr 2025)](https://developer.spotify.com/blog/2025-04-15-updating-the-criteria-for-web-api-extended-access)
- [Update on Developer Access and Platform Security (6 Feb 2026)](https://developer.spotify.com/blog/2026-02-06-update-on-developer-access-and-platform-security)
- [February 2026 Web API Migration Guide](https://developer.spotify.com/documentation/web-api/tutorials/february-2026-migration-guide)
- [Web API Rate Limits](https://developer.spotify.com/documentation/web-api/concepts/rate-limits)
- [Authorization Code with PKCE Flow](https://developer.spotify.com/documentation/web-api/tutorials/code-pkce-flow)
- [Web Playback SDK docs](https://developer.spotify.com/documentation/web-playback-sdk)
- [Design & Branding Guidelines](https://developer.spotify.com/documentation/design)
- Internal DRM/rate-limiting research notes (Widevine 429 behavior)

**Apple Music:**

- [Apple Developer Program License Agreement](https://developer.apple.com/support/downloads/terms/apple-developer-program/Apple-Developer-Program-License-Agreement-English-UK.pdf) (§3.3.6.D MusicKit)
- [MusicKit on the Web](https://developer.apple.com/musickit/web/)
- [MusicKit JS v3 docs](https://js-cdn.music.apple.com/musickit/v3/docs/index.html)
- [Apple Music API reference](https://developer.apple.com/documentation/applemusicapi/)
- [App Review Guidelines (5.2.3)](https://developer.apple.com/app-store/review/guidelines/)

**YouTube:**

- [YouTube API Services Terms of Service](https://developers.google.com/youtube/terms/api-services-terms-of-service)
- [YouTube API Services Developer Policies](https://developers.google.com/youtube/terms/developer-policies)
- [Required Minimum Functionality](https://developers.google.com/youtube/terms/required-minimum-functionality)
- [Quota Calculator](https://developers.google.com/youtube/v3/determine_quota_cost)
- [IFrame Player API Reference](https://developers.google.com/youtube/iframe_api_reference)
- [OAuth for Mobile & Desktop Apps](https://developers.google.com/youtube/v3/guides/auth/installed-apps)
- [sigma67/ytmusicapi on GitHub](https://github.com/sigma67/ytmusicapi)

**Deezer:**

- [Deezer Terms of Use](https://developers.deezer.com/termsofuse) (§IV non-commercial)
- [Deezer Developer Guidelines](https://developers.deezer.com/guidelines)
- [Deezer Developer FAQ](https://support.deezer.com/hc/en-gb/articles/360011538897-Deezer-FAQs-For-Developers) (last updated 14 May 2025)
- [Deezer Connect End of Life (19 May 2025)](https://support.deezer.com/hc/en-gb/articles/5449309457949-Deezer-Connect)
- [Deezer Community thread on SDK deprecation](https://en.deezercommunity.com/features-feedback-44/apis-to-enable-3rd-party-apps-ndk-not-available-javascript-sdk-not-working-76108)

**Amazon Music:**

- [Amazon Music Web API Overview](https://developer.amazon.com/docs/music/API_web_overview.html)
- [Amazon Music Program Requirements](https://developer.amazon.com/docs/music/requ_AM-Program-Requirements.html)
- [Amazon Music Playback Overview](https://developer.amazon.com/docs/music/API_playback_overview.html)
- [Login with Amazon authentication docs](https://developer.amazon.com/docs/music/API_web_LWA.html)

**Industry analysis:**

- [State of Spotify Web API 2025 — Lee Martin](https://spotify.leemartin.com/)
- [TechCrunch: Spotify changes developer mode API (6 Feb 2026)](https://techcrunch.com/2026/02/06/spotify-changes-developer-mode-api-to-require-premium-accounts-limits-test-users/)
- [Medium: Spotify's API Lock-Down (Feb 2026)](https://medium.com/@apollinereymond/spotifys-api-lock-down-the-end-of-open-data-for-the-music-business-0a9bf07dba27)
- [Digital Music News: YouTube Cracking Down on API Wrapper Apps (Aug 2024)](https://www.digitalmusicnews.com/2024/08/11/is-youtube-cracking-down-on-api-wrapper-apps-like-musi/)
