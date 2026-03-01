import { MOTIVATIONAL_MESSAGES, NON_MEMBER_MESSAGES } from './messages.js';
import { activateBillboards, extractSnippets } from './billboards.js';
import { placeWelcomeScene, buildStatCards, initStatSigns, setDevBadges } from './stats.js';
import { overlay, statusEl, errorEl, startBtn, exitBtn, shareBtn, setProgress } from './ui.js';

// ─── State ───────────────────────────────────────────────────────────────────
export let devArticles    = [];
export let currentUsername = '';

// ─── Fetch articles ──────────────────────────────────────────────────────────
export async function fetchArticles(username) {
  currentUsername = username;
  statusEl.textContent = 'Fetching articles…';
  errorEl.textContent  = '';
  startBtn.disabled    = true;
  setProgress(0);

  try {
    const res  = await fetch(`https://dev.to/api/articles?username=${encodeURIComponent(username)}&per_page=1000`);
    if (!res.ok) throw new Error(`DEV.to API error: ${res.status}`);
    const list = await res.json();
    if (!list.length) {
      let userExists = false;
      try {
        const chk = await fetch(`https://dev.to/api/users/by_username?url=${encodeURIComponent(username)}`);
        userExists = chk.ok;
      } catch { /* network error */ }

      if (!userExists) {
        throw new Error(`No DEV Community account found for @${username}`);
      }

      // User exists but has no articles — motivational mode
      statusEl.textContent = `No articles yet for @${username}. Showing some inspiration…`;
      const fakeArticles = MOTIVATIONAL_MESSAGES.map((msg, i) => ({
        id: i,
        title: msg.title,
        description: msg.description,
        _snippets: [msg.description],
        url: 'https://dev.to/new',
        cover_image: null,
        _startWriting: true,
        tag_list: ['writing', 'beginners', 'motivation'],
        public_reactions_count: 0,
        reading_time_minutes: 1,
      }));
      devArticles = fakeArticles;
      activateBillboards(devArticles);
      placeWelcomeScene(username, 0);
      overlay.style.transition = 'opacity 0.6s';
      overlay.style.opacity = '0';
      setTimeout(() => { overlay.style.display = 'none'; exitBtn.style.display = 'block'; }, 650);
      return;
    }

    statusEl.textContent = `Found ${list.length} articles. Loading content…`;

    // Fetch full body for snippets — pick 25 random articles
    const shuffled = [...list].sort(() => Math.random() - 0.5);
    const toFetch = shuffled.slice(0, 25);
    for (let i = 0; i < toFetch.length; i++) {
      const art = toFetch[i];
      statusEl.textContent = 'Loading article content…';
      setProgress((i + 1) / toFetch.length);
      try {
        const r = await fetch(`https://dev.to/api/articles/${art.id}`);
        if (r.status === 429) { art._snippets = [art.description || '']; continue; }
        const full = await r.json();
        art._snippets = extractSnippets(full.body_markdown || '');
      } catch { art._snippets = []; }
      await new Promise(res => setTimeout(res, 350));
    }
    // Remaining articles get description as fallback snippet
    const fetchedIds = new Set(toFetch.map(a => a.id));
    list.filter(a => !fetchedIds.has(a.id)).forEach(art => { art._snippets = art.description ? [art.description] : ['']; });

    devArticles = list;
    activateBillboards(devArticles);
    placeWelcomeScene(username, list.length);

    // Fetch badges and place as traffic signs
    try {
      const userRes = await fetch(`https://dev.to/api/users/by_username?url=${encodeURIComponent(username)}`);
      if (userRes.ok) {
        const userInfo = await userRes.json();
        const statCards = buildStatCards(userInfo, devArticles);
        setDevBadges(statCards);
        initStatSigns();
      }
    } catch { /* badges optional */ }

    // Hide overlay
    overlay.style.transition = 'opacity 0.6s';
    overlay.style.opacity = '0';
    setTimeout(() => { overlay.style.display = 'none'; exitBtn.style.display = 'block'; shareBtn.style.display = 'block'; }, 650);

  } catch (err) {
    errorEl.textContent  = err.message;
    statusEl.textContent = '';
    setProgress(0);
    startBtn.disabled    = false;
  }
}

// ─── Demo mode ───────────────────────────────────────────────────────────────
export function startDemoMode() {
  currentUsername = 'guest';
  const fakeArticles = NON_MEMBER_MESSAGES.map((msg, i) => ({
    id: i,
    title: msg.title,
    description: msg.description,
    _snippets: [msg.description],
    url: 'https://dev.to/enter',
    cover_image: null,
    _joinMode: true,
    tag_list: ['community', 'beginners', 'motivation'],
    public_reactions_count: 0,
    reading_time_minutes: 1,
  }));
  devArticles = fakeArticles;
  activateBillboards(devArticles);
  placeWelcomeScene('guest', -1);
  overlay.style.transition = 'opacity 0.6s';
  overlay.style.opacity = '0';
  setTimeout(() => { overlay.style.display = 'none'; exitBtn.style.display = 'block'; }, 650);
}
