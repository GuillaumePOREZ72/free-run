# Design — Galerie de parcours sauvegardés

**Date:** 2026-04-06
**Status:** Approved

## Contexte

Le backend expose déjà un CRUD complet pour les parcours (`GET/POST/DELETE /api/routes`).
Le `RoutePlanner` permet de créer et sauvegarder un parcours, mais il n'existe aucune UI pour
consulter ou gérer la collection. Cette feature ajoute une page dédiée.

## Décisions prises

- **Emplacement :** page dédiée `/routes` (pas intégrée au Dashboard)
- **Actions :** visualiser + supprimer (pas d'édition ni de chargement dans le planner)
- **Pattern :** liste de cartes + modal slide-up (pas de page détail séparée)

## Architecture

### Nouveau fichier

`frontend/src/pages/Routes.jsx`

### Fichiers modifiés

- `frontend/src/App.jsx` — ajout de la route `/routes`
- `frontend/src/components/Header.jsx` — ajout de "Routes" dans `navLinks`

## Page `/routes`

### Structure

```
<Routes>
  ├── Titre "My Routes" (Bebas Neue)
  ├── Bouton "New Route" → /planner
  ├── État chargement (spinner)
  ├── État vide (message + CTA /planner)
  └── Liste de RouteCard
        ├── Nom (blanc, bold)
        ├── Distance (bleu, ex: "5.20 km")
        ├── Temps estimé (ex: "31 min")
        └── Date création (ex: "Apr 6, 2026")
        → onClick → ouvre RouteModal
```

### RouteModal (slide-up)

```
<RouteModal>
  ├── Overlay semi-transparent (ferme au clic)
  ├── Panneau slide-up depuis le bas
  │     ├── Croix fermeture (top right)
  │     ├── Titre (nom du parcours)
  │     ├── MapContainer Leaflet (read-only, 280px height)
  │     │     ├── TileLayer CartoDB Dark Matter
  │     │     ├── Polyline bleue (#00A3FF)
  │     │     ├── Marker vert (départ)
  │     │     └── Marker rouge (arrivée)
  │     ├── Stats : distance / temps estimé / nb waypoints
  │     └── Zone suppression
  │           ├── [idle]    → bouton "Delete Route" (rouge outline)
  │           └── [confirm] → texte "Are you sure?" + boutons Confirm / Cancel
```

### Flux suppression

1. Clic "Delete Route" → état passe à `confirming`
2. Clic "Confirm" → `DELETE /api/routes/:id` → ferme modal → retire la carte de la liste
3. Clic "Cancel" → retour à `idle`

## API calls

| Action | Méthode | Endpoint |
|--------|---------|----------|
| Charger la liste | GET | `/api/routes` |
| Supprimer | DELETE | `/api/routes/{route_id}` |

Les deux requêtes utilisent `withCredentials: true` (cookie JWT).

## Navigation

Entrée ajoutée dans `Header.jsx` :

```js
{ to: '/routes', label: 'Routes', icon: BookOpen }
```

## Comportement de la carte Leaflet dans le modal

- `scrollWheelZoom={false}` pour ne pas bloquer le scroll de la page
- `zoomControl={false}` pour garder l'UI minimale
- `dragging={false}` — la carte est en lecture seule, pas interactive
- `fitBounds` calculé depuis les points du parcours pour centrer automatiquement

## États gérés

```js
const [routes, setRoutes]           // liste des parcours
const [loading, setLoading]         // chargement initial
const [selected, setSelected]       // parcours ouvert dans le modal (null = fermé)
const [deleteState, setDeleteState] // 'idle' | 'confirming' | 'deleting'
```
