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

// Regroupe les notes par joueur et calcule le total cumulé + le nombre de matchs notés.
function buildClassement(joueurs, notes) {
  const parJoueur = new Map();
  for (const j of joueurs) {
    parJoueur.set(j.id, { joueur: j, total: 0, matchsJoues: 0, notes: [] });
  }
  for (const n of notes) {
    const entry = parJoueur.get(n.joueur_id);
    if (!entry) continue;
    const val = Number(n.note) || 0;
    entry.total += val;
    entry.matchsJoues += 1;
    entry.notes.push(n);
  }
  return Array.from(parJoueur.values()).sort((a, b) => b.total - a.total);
}
