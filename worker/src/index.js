const NOCODB_API = "https://app.nocodb.com";
const TABLE_JOUEURS = "m135lw76cfsqy0a";
const TABLE_MATCHS = "m47sdlt7kympz4m";
const TABLE_NOTES = "mjwj1se8iafq5s8";

function cors(resp) {
  resp.headers.set("Access-Control-Allow-Origin", "*");
  resp.headers.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  resp.headers.set("Access-Control-Allow-Headers", "Content-Type,X-Admin-Password");
  return resp;
}

function json(data, status = 200) {
  return cors(new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  }));
}

async function ncFetch(env, path, options = {}) {
  const res = await fetch(`${NOCODB_API}${path}`, {
    ...options,
    headers: {
      "xc-token": env.NOCODB_TOKEN,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(`NocoDB ${res.status}: ${text.slice(0, 300)}`);
  return data;
}

async function ncList(env, tableId) {
  let rows = [];
  let offset = 0;
  while (true) {
    const page = await ncFetch(env, `/api/v2/tables/${tableId}/records?limit=100&offset=${offset}`);
    rows = rows.concat(page.list || []);
    if (!page.list || page.list.length < 100) break;
    offset += 100;
  }
  return rows;
}

function requireAdmin(request, env) {
  const supplied = request.headers.get("X-Admin-Password") || "";
  return supplied && supplied === env.ADMIN_PASSWORD;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === "OPTIONS") {
      return cors(new Response(null, { status: 204 }));
    }

    try {
      // ── Joueurs (données publiques uniquement) ──────────────────────────
      if (path === "/api/joueurs" && request.method === "GET") {
        const rows = await ncList(env, TABLE_JOUEURS);
        const joueurs = rows.map((r) => ({
          id: r.Id,
          nom: r.joueur_nom,
          prenom: r.joueur_prenom,
        }));
        return json(joueurs);
      }

      // ── Matchs ───────────────────────────────────────────────────────────
      if (path === "/api/matchs" && request.method === "GET") {
        const rows = await ncList(env, TABLE_MATCHS);
        rows.sort((a, b) => new Date(a.date_match) - new Date(b.date_match));
        return json(rows);
      }

      if (path === "/api/matchs" && request.method === "POST") {
        if (!requireAdmin(request, env)) return json({ error: "unauthorized" }, 401);
        const body = await request.json();
        const record = {
          date_match: body.date_match,
          adversaire: body.adversaire,
          lieu: body.lieu || "",
          score_equipe: body.score_equipe ?? null,
          score_adversaire: body.score_adversaire ?? null,
          grille_titre: body.grille_titre || "",
          grille_description: body.grille_description || "",
          criteres: JSON.stringify(body.criteres || []),
          note_max: body.note_max ?? (body.criteres ? body.criteres.length : null),
          commentaire: body.commentaire || "",
        };
        const created = await ncFetch(env, `/api/v2/tables/${TABLE_MATCHS}/records`, {
          method: "POST",
          body: JSON.stringify(record),
        });
        return json(created);
      }

      // ── Notes ────────────────────────────────────────────────────────────
      if (path === "/api/notes" && request.method === "GET") {
        const rows = await ncList(env, TABLE_NOTES);
        return json(rows);
      }

      if (path === "/api/notes" && request.method === "POST") {
        if (!requireAdmin(request, env)) return json({ error: "unauthorized" }, 401);
        const body = await request.json();
        const notes = Array.isArray(body.notes) ? body.notes : [];
        const records = notes.map((n) => ({
          match_id: n.match_id,
          joueur_id: n.joueur_id,
          joueur_nom: n.joueur_nom || "",
          joueur_prenom: n.joueur_prenom || "",
          note: n.note,
          present: n.present !== false,
          details: JSON.stringify(n.details || {}),
          commentaire: n.commentaire || "",
        }));
        if (records.length === 0) return json({ error: "no notes provided" }, 400);
        const created = await ncFetch(env, `/api/v2/tables/${TABLE_NOTES}/records`, {
          method: "POST",
          body: JSON.stringify(records),
        });
        return json(created);
      }

      return json({ error: "not found" }, 404);
    } catch (err) {
      return json({ error: String(err.message || err) }, 500);
    }
  },
};
