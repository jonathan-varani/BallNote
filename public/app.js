// Récupère plusieurs endpoints l'un après l'autre plutôt qu'en parallèle,
// pour éviter de déclencher la limite de requêtes concurrentes de NocoDB.
async function apiGetSequence(paths) {
  const results = [];
  for (const p of paths) results.push(await apiGet(p));
  return results;
}

async function apiGet(path) {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(`Erreur API (${res.status})`);
  return res.json();
}

async function apiPost(path, body, password) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(password ? { "X-Admin-Password": password } : {}),
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Erreur API (${res.status})`);
  return data;
}

function initials(prenom, nom) {
  const a = (prenom || "").trim()[0] || "";
  const b = (nom || "").trim()[0] || "";
  return (a + b).toUpperCase();
}

function formatDate(d) {
  if (!d) return "";
  const date = new Date(d);
  if (isNaN(date)) return d;
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

async function checkAdminPassword(pw) {
  // On valide le mot de passe en tentant un appel protégé inoffensif.
  const res = await fetch(`${API_BASE}/api/notes`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Admin-Password": pw },
    body: JSON.stringify({ notes: [] }),
  });
  return res.status !== 401; // 400 "no notes provided" = mot de passe accepté
}

// Gère l'écran de connexion partagé par les pages admin. Appelle onReady(password) une fois connecté.
function setupAdminLogin(onReady) {
  const loginCard = document.getElementById("login-card");
  const adminArea = document.getElementById("admin-area");
  const passwordInput = document.getElementById("password");
  const loginBtn = document.getElementById("login-btn");
  const loginError = document.getElementById("login-error");

  function showLoggedIn(pw) {
    loginCard.style.display = "none";
    adminArea.style.display = "block";
    onReady(pw);
  }

  loginBtn.addEventListener("click", async () => {
    const pw = passwordInput.value;
    loginError.style.display = "none";
    const ok = await checkAdminPassword(pw);
    if (!ok) {
      loginError.textContent = "Mot de passe incorrect.";
      loginError.style.display = "block";
      return;
    }
    sessionStorage.setItem("ballnote_admin_pw", pw);
    showLoggedIn(pw);
  });

  const saved = sessionStorage.getItem("ballnote_admin_pw");
  if (saved) {
    checkAdminPassword(saved).then((ok) => {
      if (ok) showLoggedIn(saved);
      else sessionStorage.removeItem("ballnote_admin_pw");
    });
  }
}

function parseCriteres(match) {
  try {
    const arr = JSON.parse(match.criteres || "[]");
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

// Regroupe les notes par joueur et calcule le total cumulé + le nombre de matchs notés.
function buildClassement(joueurs, notes) {
  const parJoueur = new Map();
  for (const j of joueurs) {
    parJoueur.set(j.id, { joueur: j, total: 0, matchsJoues: 0, notes: [] });
  }
  for (const n of notes) {
    const entry = parJoueur.get(n.joueur_id);
    if (!entry) continue;
    if (n.present !== undefined && !n.present) continue; // absent à ce match : ne compte pas dans les stats
    const val = Number(n.note) || 0;
    entry.total += val;
    entry.matchsJoues += 1;
    entry.notes.push(n);
  }
  return Array.from(parJoueur.values()).sort((a, b) => {
    if (b.total !== a.total) return b.total - a.total;
    return b.matchsJoues - a.matchsJoues;
  });
}
