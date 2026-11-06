# Guide d'utilisation - Module Admin Profile & About

## Accès à l'Admin

### 1. Démarrer l'application
```bash
cd d:\desktop\wendyprotolio
pnpm dev
```

L'application démarre sur `http://localhost:8443`

### 2. Se connecter à l'Admin
- URL: `http://localhost:8443/admin/login`
- Email: `admin@portfolio.test`
- Mot de passe: `Admin123!`

### 3. Accéder au module Profile
- Dans le sidebar, cliquer sur **"Profil & À propos"** (icône 👥)

---

## Structure du Formulaire

### Section 1 : Photo de profil
- **Affichage:** Image actuelle du profil
- **Action:** Cliquer "Remplacer la photo" pour uploader une nouvelle
- **Formats acceptés:** JPG, JPEG, PNG, WEBP
- **Taille max:** 5 MB
- **Résultat:** Aperçu affiche immédiatement
- **Note:** Pas de persistence actuellement (voir Limitations)

### Section 2 : Informations personnelles
- **Nom complet** (obligatoire) : Votre nom complet
- **Localisation** (obligatoire) : Ville/pays
- **Email** (obligatoire) : Email valide (validation)
- **Téléphone** (optionnel) : Numéro de téléphone

### Section 3 : Contenu Hero (bilingue)
- **Titre professionnel FR** : Ex: "Future Ingénieur Informatique"
- **Professional Title EN** : Ex: "Future Software Engineer"
- **Description Hero FR** : Courte description (3-5 lignes)
- **Description Hero EN** : Courte description en anglais

### Section 4 : Contenu About (bilingue)
- **Bio FR** : Paragraphe long (5+ lignes)
- **Bio EN** : Paragraphe long en anglais

### Section 5 : Disponibilité
- **Checkbox :** "Afficher le statut 'À la recherche d'opportunités'"
- Si cochée : Deux champs supplémentaires apparaissent
  - **Texte FR** : "À la recherche d'opportunités professionnelles"
  - **Texte EN** : "Open to professional opportunities"

### Section 6 : Liens & Réseaux
- **GitHub** (optionnel) : URL complète (https://github.com/...)
- **LinkedIn** (optionnel) : URL complète (https://linkedin.com/in/...)

---

## Validation du Formulaire

### Messages d'erreur possibles

| Champ | Erreur | Cause |
|-------|--------|-------|
| Nom complet | "Le nom complet est obligatoire" | Champ vide |
| Localisation | "La localisation est obligatoire" | Champ vide |
| Email | "L'email est obligatoire" | Champ vide |
| Email | "Format email invalide" | Email sans @ ou point |
| Titre FR | "Le titre professionnel FR est obligatoire" | Champ vide |
| Titre EN | "Le titre professionnel EN est obligatoire" | Champ vide |
| GitHub | "URL GitHub invalide" | URL mal formée |
| LinkedIn | "URL LinkedIn invalide" | URL mal formée |
| Photo | "Format non accepté. Accepté : JPG, JPEG, PNG, WEBP" | Mauvais format |
| Photo | "Fichier trop volumineux. Maximum 5 MB." | Fichier trop gros |

### Comment corriger les erreurs

1. **Champ obligatoire vide** → Remplir le champ
2. **Email invalide** → Vérifier la présence de @ et d'un domaine
3. **URL invalide** → Vérifier que l'URL commence par `https://`
4. **Photo rejetée** → Vérifier format et taille

Les erreurs disparaissent automatiquement quand vous modifiez le champ.

---

## Workflows Courants

### Workflow 1 : Mettre à jour son nom et email

```
1. Admin → Profil & À propos
2. Modifier "Nom complet" → "Votre Nouveau Nom"
3. Modifier "Email" → "votre.email@domaine.com"
4. Cliquer "Enregistrer les modifications"
5. Message : "Profil mis à jour avec succès" ✓
6. Frontend : Hero et Contact affichent les nouvelles données
```

### Workflow 2 : Ajouter les liens sociaux

```
1. Admin → Profil & À propos
2. Scroller jusqu'à "Liens & Réseaux"
3. GitHub : "https://github.com/votre-username"
4. LinkedIn : "https://linkedin.com/in/votre-profile"
5. Cliquer "Enregistrer les modifications"
6. Frontend : Liens GitHub et LinkedIn apparaissent
```

### Workflow 3 : Changer la description Hero

```
1. Admin → Profil & À propos
2. Section "Contenu Hero (bilingue)"
3. Description Hero FR : Nouvelle description
4. Description Hero EN : Same in English
5. Cliquer "Enregistrer les modifications"
6. Frontend : Hero affiche les nouvelles descriptions
```

### Workflow 4 : Changer la bio About

```
1. Admin → Profil & À propos
2. Section "Contenu About (bilingue)"
3. Bio FR : Nouveau paragraphe
4. Bio EN : Same paragraph in English
5. Cliquer "Enregistrer les modifications"
6. Frontend : About section affiche les nouvelles bios
```

### Workflow 5 : Désactiver la disponibilité

```
1. Admin → Profil & À propos
2. Section "Disponibilité"
3. Décocher : "Afficher le statut..."
4. Les champs de texte disparaissent
5. Cliquer "Enregistrer les modifications"
6. Frontend : Message de disponibilité disparaît
```

### Workflow 6 : Annuler les modifications

```
1. Admin → Profil & À propos
2. Modifier plusieurs champs
3. Bouton "Annuler les modifications" apparaît en bas
4. Cliquer "Annuler les modifications"
5. Le formulaire revient aux valeurs initiales
```

---

## Vérification sur le Frontend

### Comment vérifier que vos changements Admin apparaissent

#### 1. Hero Section
- Ouvrir `http://localhost:8443`
- Vérifier :
  - Votre nom en gros titre
  - Votre titre professionnel
  - Votre description longue

#### 2. About Section
- Scroller vers le bas
- Section "À propos de moi" / "About me"
- Vérifier votre bio affichée

#### 3. Contact Section
- Continuer à scroller
- Section "Contact"
- Vérifier :
  - Votre email
  - Votre localisation
  - Votre téléphone

#### 4. Liens Sociaux
- Hero section : Haut à droite
- Contact section : En bas
- Si vous avez ajouté GitHub/LinkedIn : Liens apparaissent

#### 5. Bilingue
- Haut de la page : Boutons "FR" et "EN"
- Cliquer "EN"
- Vérifier que tout passe en anglais
- Cliquer "FR"
- Vérifier français

---

## Limitations & Comportement Actuel

### 1. Photo de profil
**Limitation :** Pas de stockage persistant

**Comportement :**
- ✅ Aperçu fonctionne pendant la session
- ❌ Photo pas sauvegardée après refresh
- ❌ Frontend utilise toujours `/images/profile.jpg`

**Solution manuelle :**
1. Sélectionner nouvelle photo
2. Voir l'aperçu
3. Si satisfait : Remplacer manuellement le fichier `public/images/profile.jpg`
4. Rafraîchir le navigateur

### 2. Données perdues après refresh
**Limitation :** Pas de backend

**Comportement :**
- ✅ Pendant la session courante : Changements persistent
- ❌ Après page refresh : Données reviennent aux valeurs par défaut
- ❌ Après fermer l'onglet : Tout est perdu

**Solution future :**
- Backend MERN (Node.js, Express, MongoDB)

### 3. Pas de fichiers uploading serveur
**Limitation :** Pas de endpoint d'upload

**Comportement :**
- ✅ Validation de fichier client-side (type, taille)
- ✅ Aperçu avant upload
- ❌ Pas d'upload serveur
- ❌ Pas de stockage cloud

---

## Dépannage

### Problème : Le formulaire affiche une erreur mais je ne sais pas pourquoi

**Solution :**
- Regarder le message d'erreur rouge sous le champ
- Vérifier le tableau "Messages d'erreur" ci-dessus
- Corriger selon les indications

### Problème : Je ne peux pas enregistrer

**Cause probable :**
- Il y a une erreur de validation (voir le message rouge)
- Tous les champs obligatoires doivent être remplis

**Solution :**
1. Vérifier qu'aucun message d'erreur n'apparaît
2. Vérifier que tous les champs obligatoires sont remplis
3. Réessayer d'enregistrer

### Problème : Mes changements ne s'affichent pas en Frontend

**Cause probable :**
- Vous n'avez pas enregistré le formulaire

**Solution :**
1. Retourner à Admin Profile
2. S'assurer d'avoir cliqué "Enregistrer les modifications"
3. Attendre le message de succès
4. Rafraîchir le Frontend

### Problème : J'ai perdu tous mes changements

**Cause probable :**
- Page refresh (données en RAM seulement)

**Comportement :**
- C'est normal actuellement (in-memory storage)
- Backend pour persistent storage en cours de développement

**Workaround :**
- Ne pas rafraîchir la page Admin sans enregistrer
- Les changements restent pendant la session courante

---

## Notes Importantes

### Données En-Mémoire
- Les données sont stockées en RAM du navigateur
- Persist pendant la session courante
- Perdu au refresh
- C'est volontaire et temporaire

### Services Affichés
- Frontend consomme les données depuis `src/services/profileService.js`
- Pas encore de Backend API
- A venir : Backend MERN

### Vérification Bilingue
- Chaque champ a une version FR et EN
- Ils travaillent indépendamment
- Tous les deux doivent être remplis

### Liens Sociaux Conditionnels
- S'ils ne sont pas remplis : N'apparaissent pas en Frontend
- S'ils sont remplis : Apparaissent et ouvrent dans un nouvel onglet
- URLs doivent commencer par `https://`

---

## Prochaines Étapes (Roadmap)

### Phase 1 : Backend (Prochain)
- [ ] Node.js + Express server
- [ ] MongoDB collection pour profil
- [ ] Endpoints API GET/PUT `/api/profile`
- [ ] Authentification Admin
- [ ] Remplacement des in-memory data par API calls

### Phase 2 : Fichiers
- [ ] Endpoint upload photo serveur
- [ ] Stockage en base ou cloud (S3, Cloudinary)
- [ ] Supprimer limite 5MB côté client
- [ ] Validation côté serveur

### Phase 3 : Autres Modules
- [ ] Admin Experiences
- [ ] Admin Skills
- [ ] Admin Services
- [ ] Admin Messages
- [ ] Admin Translations
- [ ] Admin Settings

---

## Support

Pour des questions ou problèmes :
- Vérifier `docs/CHANGELOG_DEV.md` pour les détails techniques
- Vérifier le code de `src/services/profileService.js`
- Vérifier le composant `ProfileAdmin` dans `src/App.jsx`
