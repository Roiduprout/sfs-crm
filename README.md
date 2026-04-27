# SFS CRM

CRM local pour tracker les SFS (Shoutout For Shoutout) OnlyFans.

**Live** → https://Roiduprout.github.io/sfs-crm/

## Features

- Suivi des SFS : @telegram, modèle, dates, subs gagnés, statut
- Calcul automatique des taux de performance (30j, total, CTR)
- Verdicts : Excellent / Bon / Moyen / Nul
- Vue tableau + vue calendrier mensuelle
- Import / Export CSV
- Données stockées en localStorage (privées, jamais envoyées)
- Auto-update : bandeau discret si une nouvelle version est disponible

## Mise à jour

```bash
# Modifier index.html + incrémenter version dans version.json et APP_VERSION
git add .
git commit -m "vX.X.X - description"
git push
```

GitHub Pages se met à jour automatiquement en ~1 minute.
