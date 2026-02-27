# Sunday DEV Drive 🚗☀️

A web-based arcade driving game where players "drive through" their own DEV articles, visualized as roadside billboards.

---

# 🎯 Project Vision

**Sunday Drive** is a chill, arcade-style web driving experience that transforms a developer’s DEV articles into a visual road journey.

Players enter their DEV username, and their published articles become:

* Roadside billboards
* Environmental modifiers
* Gameplay parameters

The goal is not realism — it’s creativity, atmosphere, and clever API-driven procedural generation.

---

# 🏆 Weekend Challenge Goal

Deliver a polished MVP that:

* Integrates with the DEV public API
* Generates a playable 3D driving scene
* Maps article metadata to visual/game elements
* Feels cohesive and intentional

Avoid overengineering.

---

# 🧱 MVP Scope (Strict)

## Core Gameplay

* Infinite straight road
* Forward auto-drive
* Left / Right steering
* Basic collision boundaries
* Distance counter

## Visual Style

* Sunset lighting (default vibe)
* Simple skybox or gradient background
* Low-poly aesthetic
* Minimal but clean UI

## DEV Integration

* Username input field
* Fetch articles via:
  GET [https://dev.to/api/articles?username=USERNAME](https://dev.to/api/articles?username=USERNAME)
* Extract from response:

  * title
  * description
  * public_reactions_count
  * reading_time_minutes
  * tags

## Article → Gameplay Mapping

| Article Data | Game Effect                 |
| ------------ | --------------------------- |
| Title        | Billboard headline          |
| Description  | Billboard subtitle          |
| Reactions    | Billboard size scale        |
| Reading time | Distance between billboards |
| Tags         | Billboard color tint        |

Spawn one billboard per article along the road.

---

# 🏗 Technical Architecture

## Frontend

* Three.js for 3D rendering
* Vanilla JS or lightweight framework (no heavy SPA unless necessary)
* Fetch API for DEV integration

## Scene Structure

Scene
├── Camera (follow car)
├── Car (simple box mesh)
├── Road (repeating plane segments)
├── Billboards (generated from API data)
└── Lights (directional + ambient)

## Road Strategy

* Use repeating plane segments
* Reposition segments when they pass camera (infinite illusion)

## Billboard Strategy

* Create a reusable billboard component
* Plane geometry + texture (CanvasTexture for dynamic text)
* Spawn at fixed Z intervals

---

# 🗓 48-Hour Execution Plan

## Day 1 – Core Engine

### Phase 1: Scene Setup (2–3 hours)

* Initialize Three.js
* Create camera, renderer, lighting
* Add simple ground plane

### Phase 2: Car + Movement (3–4 hours)

* Add car mesh
* Forward constant velocity
* Left/right steering
* Camera follow system

### Phase 3: Infinite Road (2–3 hours)

* Create 3–5 road segments
* Recycle segments when behind camera

Goal by end of Day 1:
Playable endless driving prototype.

---

## Day 2 – DEV Integration + Polish

### Phase 4: API Integration (2–3 hours)

* Username input UI
* Fetch articles
* Handle loading & error states

### Phase 5: Billboard Generator (3–4 hours)

* Create text texture system
* Generate billboard mesh per article
* Position along road

### Phase 6: Data Mapping (2 hours)

* Scale billboard by reactions
* Adjust spacing by reading time
* Color by first tag

### Phase 7: Polish (2–3 hours)

* Add subtle fog
* Add light road lines
* Add simple speed/distance UI
* Improve typography on billboards

Goal by end of Day 2:
Fully playable experience driven by real DEV data.

---

# 🚫 Out of Scope (For Weekend)

* Curved spline roads
* Realistic physics engine
* Multiplayer
* Complex terrain
* Authentication with API keys
* Full article body parsing

These can be added post-challenge.

---

# 🧪 Stretch Goals (If Time Permits)

* Weather presets based on dominant tag
* "Top Article Highway" mode
* Smooth fade-in animation for billboards
* Simple background music toggle
* Shareable screenshot button

---

# 🎨 Design Principles

* Cozy, not competitive
* Clean UI
* Developer-centric humor allowed
* Focus on concept clarity over complexity

---

# 📝 Dev.to Submission Angle

Emphasize:

* Turning content into procedural game data
* Creative API usage
* Gamified portfolio visualization
* Weekend build discipline

Possible tagline:

"Drive through your thoughts."

---

# 🚀 Post-Challenge Expansion Ideas

* Curved procedural roads
* Multiplayer drive-through-any-user mode
* GitHub integration mode
* Weather API mode
* Drifting physics mode

---

# ✅ Definition of Done (MVP)

* User enters DEV username
* Articles load successfully
* At least 5 billboards spawn
* Car can drive infinitely
* No console errors
* Clean README with screenshots

If all of the above works — ship it.

---

Sunday Drive is about vibe + creativity + API magic — not technical perfection.