# Déploiement RunTracker sur o2switch (Offre Unique Cloud)

## Prérequis

- Accès cPanel o2switch (https://clients.o2switch.fr)
- Accès SSH au serveur
- Application buildée et fonctionnelle en local
- Backend : FastAPI + MongoDB Atlas
- Frontend : React + Vite (génère des fichiers statiques)

---

## Étape 1 — Domaine et DNS

### Option A : Utiliser le sous-domaine technique o2switch

Dans cPanel → **"Domaines"**, o2switch fournit un sous-domaine technique du type :
- `tonlogin.odns.fr`
- ou `tonlogin.o2switch.net`

Ce sous-domaine pointe déjà sur ton hébergement. Tu peux l'utiliser directement.

### Option B : Acheter et configurer un vrai domaine

1. Achète un domaine chez o2switch, OVH, ou Namecheap
2. Dans cPanel → **"Domaines" → "Sous-domaines"**, crée :
   - `runtracker.tondomaine.fr` → dossier `public_html/runtracker` (frontend)
   - `api.tondomaine.fr` → dossier `public_html/api` (pour proxy vers FastAPI)
3. Pointe les DNS du registrar vers les serveurs o2switch si domaine externe

> **Recommandation :** utiliser deux sous-domaines distincts :
> - `app.tondomaine.fr` → frontend
> - `api.tondomaine.fr` → backend FastAPI

---

## Étape 2 — SSL / HTTPS (obligatoire pour la PWA)

Sans HTTPS, l'installation PWA est impossible sur mobile.

1. Dans cPanel → **"SSL/TLS" → "Certificats SSL gratuits (Let's Encrypt)"**
2. Sélectionne tous tes domaines/sous-domaines
3. Clique **"Installer"**
4. Renouvellement automatique intégré — rien à gérer ensuite

---

## Étape 3 — Déploiement du frontend (fichiers statiques)

### 3.1 Build en local

```bash
cd frontend

# Mettre à jour VITE_BACKEND_URL dans .env pour pointer vers la prod
echo 'VITE_BACKEND_URL=https://api.tondomaine.fr' > .env.production

npm run build
# Génère le dossier dist/
```

### 3.2 Envoi sur le serveur

```bash
# Via SCP (SSH)
scp -r dist/* tonlogin@ssh.o2switch.net:~/public_html/runtracker/

# Ou via rsync (préférable pour les mises à jour)
rsync -avz --delete dist/ tonlogin@ssh.o2switch.net:~/public_html/runtracker/
```

Alternativement, utilise le **Gestionnaire de fichiers** dans cPanel pour uploader l'archive `dist.zip` et la décompresser.

### 3.3 Fichier .htaccess (obligatoire pour React Router)

Sans ce fichier, toutes les URLs directes (ex: `/dashboard`) renvoient une erreur 404.

Créer le fichier `public_html/runtracker/.htaccess` :

```apache
Options -MultiViews
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^ index.html [QSA,L]
```

Ce fichier peut aussi être placé dans `frontend/public/.htaccess` avant le build
pour être automatiquement inclus dans `dist/`.

---

## Étape 4 — Déploiement du backend (FastAPI)

### 4.1 Créer l'application Python dans cPanel

1. Dans cPanel → **"Setup Python App"**
2. Clique **"Create Application"** avec les paramètres suivants :

| Champ | Valeur |
|-------|--------|
| Python version | 3.11 (ou la plus récente disponible) |
| Application root | `runtracker_backend` |
| Application URL | `/` (ou sous-domaine dédié `api.tondomaine.fr`) |
| Application startup file | `passenger_wsgi.py` (à créer, voir ci-dessous) |
| Application Entry point | `application` |

3. Clique **"Create"** → cPanel crée l'environnement virtuel

### 4.2 Créer le fichier passenger_wsgi.py

o2switch utilise **Passenger** (pas uvicorn directement). Il faut un fichier adaptateur.

Créer `~/runtracker_backend/passenger_wsgi.py` :

```python
import sys
import os

# Ajouter le répertoire courant au path
sys.path.insert(0, os.path.dirname(__file__))

# Charger l'app FastAPI via ASGI → WSGI bridge
from a2wsgi import ASGIMiddleware
from server import app as fastapi_app

application = ASGIMiddleware(fastapi_app)
```

### 4.3 Uploader les fichiers backend

```bash
# Depuis la racine du projet
scp backend/server.py tonlogin@ssh.o2switch.net:~/runtracker_backend/
scp backend/pyproject.toml tonlogin@ssh.o2switch.net:~/runtracker_backend/
scp backend/.env tonlogin@ssh.o2switch.net:~/runtracker_backend/
```

> **Attention :** ne jamais versionner le `.env` (secrets). L'uploader manuellement.

### 4.4 Installer les dépendances

Se connecter en SSH :

```bash
ssh tonlogin@ssh.o2switch.net
cd ~/runtracker_backend

# Activer le venv créé par cPanel (le chemin exact est affiché dans cPanel)
source ~/virtualenv/runtracker_backend/3.11/bin/activate

# Installer les dépendances
pip install fastapi uvicorn motor pymongo python-jose[cryptography] bcrypt httpx python-dotenv a2wsgi
```

### 4.5 Configurer le .env de production

Sur le serveur, éditer `~/runtracker_backend/.env` :

```env
MONGO_URL=mongodb+srv://user:password@cluster.mongodb.net/runtracker
JWT_SECRET=une_cle_tres_secrete_differente_de_la_dev
FRONTEND_URL=https://app.tondomaine.fr
ENVIRONMENT=production
```

### 4.6 Configurer les CORS dans server.py

S'assurer que le frontend de production est dans les origines autorisées.

Dans `server.py`, la liste des origines doit inclure l'URL de production :

```python
origins = [
    os.getenv("FRONTEND_URL", "http://localhost:3000"),
    "https://app.tondomaine.fr",  # à adapter
]
```

### 4.7 Redémarrer l'application

Dans cPanel → **"Setup Python App"** → bouton **"Restart"** à côté de l'application.

---

## Étape 5 — MongoDB Atlas (réseau)

MongoDB Atlas doit accepter les connexions depuis l'IP du serveur o2switch.

1. Dans MongoDB Atlas → **"Network Access"**
2. Clique **"Add IP Address"**
3. Récupère l'IP du serveur o2switch :
   ```bash
   ssh tonlogin@ssh.o2switch.net "curl -s ifconfig.me"
   ```
4. Ajoute cette IP dans Atlas

> **Alternative :** autoriser `0.0.0.0/0` (toutes les IPs) — moins sécurisé mais plus simple.

---

## Étape 6 — Vérification finale

### Checklist

- [ ] Frontend accessible sur `https://app.tondomaine.fr`
- [ ] Cadenas HTTPS présent dans la barre d'adresse
- [ ] Navigation entre les pages fonctionne sans 404 (React Router)
- [ ] Backend répond sur `https://api.tondomaine.fr/health` (ou `/docs`)
- [ ] Login / Register fonctionnels
- [ ] Sur mobile Chrome : bandeau "Ajouter à l'écran d'accueil" apparaît

### Tester l'installation PWA

1. Ouvrir Chrome sur Android → `https://app.tondomaine.fr`
2. Attendre ~30 secondes → bandeau en bas de l'écran
3. Ou : menu `⋮` → "Ajouter à l'écran d'accueil"

Sur iOS Safari :
1. Ouvrir `https://app.tondomaine.fr`
2. Icône de partage → "Sur l'écran d'accueil"

---

## Mises à jour futures

### Frontend

```bash
cd frontend
npm run build
rsync -avz --delete dist/ tonlogin@ssh.o2switch.net:~/public_html/runtracker/
```

### Backend

```bash
scp backend/server.py tonlogin@ssh.o2switch.net:~/runtracker_backend/
ssh tonlogin@ssh.o2switch.net
# Dans cPanel → Setup Python App → Restart
```

---

## Problèmes courants

| Symptôme | Cause probable | Solution |
|----------|----------------|----------|
| 404 sur les URLs directes | `.htaccess` manquant | Créer le fichier `.htaccess` décrit à l'étape 3.3 |
| PWA non installable | HTTP au lieu de HTTPS | Vérifier Let's Encrypt activé (étape 2) |
| Erreurs CORS | Origines non configurées | Ajouter l'URL prod dans `FRONTEND_URL` et la liste `origins` |
| MongoDB connexion refusée | IP non whitelistée | Ajouter l'IP o2switch dans Atlas Network Access |
| 500 sur le backend | Dépendances manquantes | Vérifier `pip install` dans le venv cPanel |
| App blanche au chargement | `VITE_BACKEND_URL` incorrect | Vérifier `.env.production` avant le build |
