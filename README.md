# BallNote — U15

Site de suivi des notes de match pour l'équipe U15. Chaque joueur peut consulter
son historique de notes match par match, et le classement cumulé de l'équipe.

## Structure

- `public/` — site statique (GitHub Pages) : liste des joueurs, fiche joueur,
  classement, page admin de saisie.
- `worker/` — API Cloudflare Worker qui fait le lien entre le site et NocoDB
  (les secrets NocoDB et le mot de passe admin restent côté serveur, jamais
  exposés dans le code public).

## Données (NocoDB)

- Table `Contacts Joueurs` — déjà existante.
- Table `Matchs` — un match par ligne (date, adversaire, grille d'évaluation
  utilisée, note max...).
- Table `Notes Matchs` — une ligne par (joueur, match, note).

## Déploiement du Worker

```
cd worker
npx wrangler deploy
npx wrangler secret put NOCODB_TOKEN
npx wrangler secret put ADMIN_PASSWORD
```

## Frontend

Le dossier `public/` est prévu pour GitHub Pages. Mettre à jour `API_BASE`
dans `public/config.js` avec l'URL du Worker déployé.
