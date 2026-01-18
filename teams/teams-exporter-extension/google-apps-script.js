/**
 * Google Apps Script - Teams Exporter v3 avec OpenAI
 *
 * AJOUTE les messages à la fin sans supprimer les données existantes
 * Utilise OpenAI pour analyser et catégoriser les messages
 *
 * Colonnes du document :
 * DATE | URGENCE / IMPACT | CATÉGORIE | PROBLÈME | DESCRIPTION | COMMANDE | SIGNALÉ PAR | CANAL | STATUT | COMMENTAIRE
 *
 * CONFIGURATION:
 * Exécuter setupConfig() une fois pour configurer les clés API
 * Ou aller dans: Paramètres du projet > Propriétés du script
 */

// =====================================================
// CONFIGURATION - Chargement dynamique depuis PropertiesService
// =====================================================
function getConfig(key) {
  const props = PropertiesService.getScriptProperties();
  const value = props.getProperty(key);
  if (!value) {
    Logger.log(`⚠️ Configuration manquante: ${key}. Exécutez setupConfig() ou configurez dans Paramètres du projet > Propriétés du script`);
  }
  return value || '';
}

// Raccourcis pour accéder aux configs
const SPREADSHEET_ID = getConfig('SPREADSHEET_ID');
const OPENAI_API_KEY = getConfig('OPENAI_API_KEY');
const CLICKUP_API_KEY = getConfig('CLICKUP_API_KEY');
const CLICKUP_LIST_ID = getConfig('CLICKUP_LIST_ID');

// Statut qui déclenche la création d'une tâche ClickUp (un seul)
const CLICKUP_TRIGGER_STATUS = 'En cours d\'investigation';

/**
 * ⚠️ EXÉCUTER UNE FOIS pour configurer les clés API
 * Modifiez les valeurs ci-dessous puis exécutez cette fonction
 */
function setupConfig() {
  const props = PropertiesService.getScriptProperties();

  props.setProperties({
    'SPREADSHEET_ID': '1awbevdaGMHIhPtW8p1Zx6uLEQyTmUNCBS28Omn_YEpc',
    'OPENAI_API_KEY': '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',
    'CLICKUP_API_KEY': 'pk_150608283_RQ29MFCYFQR9B7UGXKSEUTZTLQG332W0',
    'CLICKUP_LIST_ID': '901215324535'
  });

  Logger.log('✅ Configuration sauvegardée!');
  Logger.log('Propriétés actuelles:');
  const all = props.getProperties();
  for (const key in all) {
    // Masquer les clés sensibles dans les logs
    const value = all[key];
    const masked = value.length > 10 ? value.substring(0, 6) + '...' + value.substring(value.length - 4) : value;
    Logger.log(`  ${key}: ${masked}`);
  }
}

/**
 * Affiche la configuration actuelle (masquée)
 */
function showConfig() {
  const props = PropertiesService.getScriptProperties();
  const all = props.getProperties();

  Logger.log('=== Configuration actuelle ===');
  for (const key in all) {
    const value = all[key];
    const masked = value.length > 10 ? value.substring(0, 6) + '...' + value.substring(value.length - 4) : value;
    Logger.log(`${key}: ${masked}`);
  }

  if (Object.keys(all).length === 0) {
    Logger.log('❌ Aucune configuration trouvée. Exécutez setupConfig()');
  }
}

// Mapping des priorités Sheet -> ClickUp (1=urgent, 2=high, 3=normal, 4=low)
const PRIORITY_MAP = {
  'Critique': 1,
  'Majeur': 2,
  'Mineur': 3,
  'N/A': 4
};

/**
 * Nettoie le contenu d'un message :
 * - Supprime les réactions Teams (ex: "1 réaction Bouton de coche.")
 * - Supprime les retours à la ligne
 * - Supprime les espaces multiples
 */
function cleanMessageContent(content) {
  if (!content) return '';

  return content
    // Supprimer les réactions Teams
    .replace(/\d+\s*réaction[s]?\s*(Bouton de coche|J'aime|Sablier en verre terminé|Cœur|Rire|Surpris|Triste|En colère)\.?/gi, '')
    // Supprimer les retours à la ligne
    .replace(/[\r\n]+/g, ' ')
    // Supprimer les espaces multiples
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Listes des valeurs autorisées (extraites du Google Sheet existant)
 */
const URGENCES = ['Critique', 'Majeur', 'Mineur', 'N/A'];

const CATEGORIES = [
  'Mail de confirmation', 'Mon compte', 'Commandes', 'Rapports', 'Plan de salle',
  'Mail contact', 'Clients', 'Admin', 'Douchette', 'Chèque cadeau', 'Billetterie',
  'Structure', 'Remboursement de masse'
];

const PROBLEMES = [
  'Mail de confirmation non reçu', 'Billets non affichés', 'Non payée',
  'Trop perçu / Écart de paiement', 'Génération rapport', 'Réinitialisation mot de passe',
  'Places bloquées opérateurs', 'Places non dispos en front', 'Places bloquées tunnel web',
  'Adresse de facturation', 'Création de commande', 'Mauvais expéditeur',
  'Génération documents', 'Place dispo liée à une commande', 'Affichage panier',
  'Commande bloquée', 'Fusion fiche', 'Boucle de redirection', 'Lenteurs', 'Doublons',
  'Commande vide à 0€', 'Sélection place', 'Ajout commentaire', 'Paiement chèque-cadeau',
  'Validation justificatif', 'Lien commande', 'Vérification lock de place',
  'Vérification compte client', 'Vérification justificatif', 'Accès contingent',
  'Connexion', 'Archivage fiche', 'Association groupe adhérent', 'Accès tarif',
  'Affichage spectateur', 'Déplacement en salle', 'Séance passée : siège grisé',
  'Suppression manuelle billets', 'Rattachement opérateur', 'Mise à jour coordonnées',
  'Téléchargement billets', 'Téléchargement de facture', 'Remboursement', 'Filtre liste',
  'Billet à payer', 'Mauvais statut commande', 'Places bloquées', 'Mise en avant spectacles',
  'Mise à jour email', 'Interface qui saute', 'Gestion des vues',
  'Affichage mauvaise date billet', 'Problème paiement', 'Impression plan de salle',
  'Commande non présente', 'Droits rôles supprimés', 'Problème scan billet',
  'Vérification si scan billet', 'Génération chèque cadeau', 'Commande annulée, paiement valide',
  'Affichage holder billet', 'Erreur 500', 'Problème affichage statut commande'
];

const STATUTS = [
  'Nouveau', 'Correction technique', 'Correction manuelle', 'En cours d\'investigation',
  'En cours de correction', 'Corrigé', 'Non lié au système', 'Vérification', 'En attente'
];

/**
 * Vérifie si deux dates sont le même jour (format DD/MM/YYYY)
 */
function isSameDay(dateStr1, dateStr2) {
  if (!dateStr1 || !dateStr2) return false;
  return dateStr1.toString().trim() === dateStr2.toString().trim();
}

/**
 * Vérifie si un message est une citation (contient un identifiant + date)
 * Ces messages sont des réponses qui citent un message précédent
 */
function isQuotedMessage(content) {
  if (!content) return false;
  // Pattern 1: Prénom Nom DD/MM/YYYY (avec ou sans heure)
  // Ex: "Isabelle Pallet 16/01/2026 11:30" ou "Stephen Cornet 16/01/2026"
  const pattern1 = /[A-ZÀ-Ý][a-zà-ÿ]+\s+[A-ZÀ-Ý][a-zà-ÿ]+\s+\d{2}\/\d{2}\/\d{4}/;

  // Pattern 2: identifiant.style ou identifiant DD/MM/YYYY
  // Ex: "marine.trehorel 18/01/2026" ou "jean.dupont 16/01/2026"
  const pattern2 = /[a-zA-Z][a-zA-Z0-9._-]+\s+\d{2}\/\d{2}\/\d{4}/;

  return pattern1.test(content) || pattern2.test(content);
}

/**
 * Vérifie si un message est un message simple à ignorer (pas une demande de support)
 * Salutations, remerciements, bavardage, etc.
 */
function isSimpleNonSupportMessage(content) {
  if (!content) return true;

  const cleaned = content.toLowerCase().trim()
    .replace(/[\r\n]+/g, ' ')
    .replace(/\s+/g, ' ');

  // Messages très courts (moins de 30 caractères) qui ne contiennent pas de mots-clés support
  const supportKeywords = ['help', 'problème', 'probleme', 'erreur', 'bug', 'bloqué', 'bloque',
    'fusionner', 'fusion', 'modifier', 'commande', 'accès', 'acces', 'impossible',
    'pouvez-vous', 'pouvez vous', 'merci de', 'il faudrait', 'possible de', 'svp', 's\'il vous plaît'];

  const hasKeyword = supportKeywords.some(kw => cleaned.includes(kw));

  // Liste de messages à ignorer (exact ou qui commencent par)
  const ignoreExact = [
    'merci', 'merci !', 'merci!', 'merci beaucoup', 'ok', 'okay', 'd\'accord', 'daccord',
    'parfait', 'super', 'top', 'génial', 'genial', 'cool', 'nickel', 'impeccable',
    'bonjour', 'bonsoir', 'salut', 'coucou', 'hello', 'hi',
    'bonne journée', 'bonne journee', 'bonne soirée', 'bonne soiree', 'bon week-end', 'bon weekend',
    'à bientôt', 'a bientot', 'à plus', 'a plus', 'bye', 'ciao',
    'oui', 'non', 'c\'est bon', 'c\'est fait', 'c\'est noté', 'noté', 'note',
    'je te remercie', 'je vous remercie'
  ];

  // Patterns de messages à ignorer (commence par)
  const ignoreStartsWith = [
    'merci ', 'bonjour,', 'bonsoir,', 'salut,', 'ok ', 'okay ',
    'bonne ', 'bon ', 'super ', 'parfait ', 'génial ', 'top '
  ];

  // Vérifier correspondance exacte
  if (ignoreExact.includes(cleaned)) {
    return true;
  }

  // Vérifier si commence par un pattern à ignorer ET pas de mot-clé support
  if (!hasKeyword) {
    for (const prefix of ignoreStartsWith) {
      if (cleaned.startsWith(prefix) && cleaned.length < 50) {
        return true;
      }
    }

    // Messages très courts sans mot-clé support
    if (cleaned.length < 25) {
      return true;
    }
  }

  return false;
}

/**
 * Normalise un texte pour la comparaison (doublons)
 */
function normalizeText(text) {
  if (!text) return '';
  return text.toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')           // Espaces multiples -> un seul
    .replace(/['']/g, "'")          // Apostrophes uniformes
    .substring(0, 150);             // Limiter la longueur
}

/**
 * Valide et corrige les valeurs retournées par l'IA
 * Retourne null si le message n'est pas un ticket de support
 */
function validateAnalysis(analysis) {
  if (!analysis) return null;

  // Si l'IA a détecté que ce n'est pas un message de support, retourner null
  if (analysis.isSupport === false) {
    Logger.log('Message marked as non-support by AI');
    return null;
  }

  // Trouver la valeur la plus proche dans une liste
  function findClosest(value, list, defaultVal) {
    if (!value) return defaultVal;
    const lower = value.toLowerCase().trim();

    // Correspondance exacte
    const exact = list.find(item => item.toLowerCase() === lower);
    if (exact) return exact;

    // Correspondance partielle
    const partial = list.find(item =>
      item.toLowerCase().includes(lower) || lower.includes(item.toLowerCase())
    );
    if (partial) return partial;

    return defaultVal;
  }

  return {
    isSupport: true,
    urgence: findClosest(analysis.urgence, URGENCES, 'Mineur'),
    categorie: findClosest(analysis.categorie, CATEGORIES, 'Commandes'),
    probleme: findClosest(analysis.probleme, PROBLEMES, analysis.probleme || ''),
    commande: analysis.commande || '',
    statut: findClosest(analysis.statut, STATUTS, 'Nouveau')
  };
}

/**
 * Analyse un message avec OpenAI pour extraire les informations pertinentes
 * Adapté au système de billetterie RNDV de la Comédie-Française
 */
function analyzeMessageWithAI(messageContent, author) {
  const prompt = `Tu analyses des messages du support de la Comédie-Française (système billetterie RNDV).

Message de ${author}:
"${messageContent}"

Tu dois choisir UNIQUEMENT parmi les valeurs suivantes:

URGENCE / IMPACT (obligatoire, choisis une seule):
${URGENCES.map(u => '- ' + u).join('\n')}

CATÉGORIE (obligatoire, choisis une seule):
${CATEGORIES.map(c => '- ' + c).join('\n')}

PROBLÈME (obligatoire, choisis le plus proche):
${PROBLEMES.map(p => '- ' + p).join('\n')}

STATUT (utilise "Nouveau" par défaut):
${STATUTS.map(s => '- ' + s).join('\n')}

RÈGLES:
- Critique = représentation imminente (<24h), client bloqué, paiement échoué
- Majeur = problème impactant mais pas immédiat
- Mineur = demande simple (fusion, modification email, info)
- Extrais TOUS les numéros de commande (W.XXXX.XXXXX, XXXXX, etc.) et chèques cadeaux (XXXX-XXXX-XXXX)

IMPORTANT - RÈGLE D'INCLUSION (SOIS TRÈS STRICT):
Par DÉFAUT, mets isSupport: false. Mets isSupport: true SEULEMENT si TOUTES ces conditions sont remplies:
1. Le message est une DEMANDE INITIALE (pas une réponse)
2. Le message contient une ACTION demandée ou un PROBLÈME signalé
3. Le message ne cite PAS un autre message (pas de format "Prénom Nom Date")

Mets OBLIGATOIREMENT isSupport: false si:
- Message court sans demande claire (Merci, OK, Bonjour, Bonne soirée, D'accord, Parfait, Super)
- Réponse/confirmation ("La fusion est faite", "C'est corrigé", "Je confirme", "c'est fait", "c'est réglé")
- Message qui cite un message précédent (contient "Prénom Nom JJ/MM/AAAA")
- Message du support répondant ("Bonjour [Prénom]", "Je te tiendrai au courant")
- Bavardage ("Bon week-end", "je peux venir vous voir", "Ça va ?")
- Remerciements même avec texte ("Merci Bonne soirée", "Merci beaucoup", "Je te remercie")

Mets isSupport: true UNIQUEMENT si le message:
- Contient "help" ET décrit un problème concret
- OU demande explicitement une action ("pouvez-vous", "merci de", "il faudrait", "possible de fusionner")
- OU signale un problème ("je n'ai plus accès", "problème", "erreur", "bloqué", "ne fonctionne pas")
- ET ne correspond à aucun critère d'exclusion ci-dessus

Réponds UNIQUEMENT en JSON valide (sans backticks ni markdown):
{
  "isSupport": true,
  "urgence": "valeur exacte de la liste",
  "categorie": "valeur exacte de la liste",
  "probleme": "valeur exacte de la liste",
  "commande": "numéro(s) séparés par espace ou vide",
  "statut": "Nouveau"
}`;

  try {
    const response = UrlFetchApp.fetch('https://api.openai.com/v1/chat/completions', {
      method: 'post',
      headers: {
        'Authorization': 'Bearer ' + OPENAI_API_KEY,
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Tu es un assistant qui analyse des messages de support pour un système de billetterie (Comédie-Française). Tu extrais les informations clés et les catégorises. Réponds uniquement en JSON valide.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 200
      }),
      muteHttpExceptions: true
    });

    const result = JSON.parse(response.getContentText());

    if (result.error) {
      Logger.log('OpenAI API error: ' + JSON.stringify(result.error));
      return null;
    }

    const content = result.choices[0].message.content.trim();
    Logger.log('OpenAI response: ' + content);

    // Parser le JSON (enlever les backticks si présents)
    let jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(jsonStr);

  } catch (error) {
    Logger.log('Error calling OpenAI: ' + error.toString());
    return null;
  }
}

/**
 * Analyse si un message est une mise à jour d'un problème existant
 * Retourne l'index de la ligne à mettre à jour ou null si c'est un nouveau message
 */
function findRelatedRow(newMessage, existingRows) {
  if (!existingRows || existingRows.length === 0) return null;

  // Filtrer pour garder seulement les lignes récentes et du même auteur en priorité
  const messageAuthor = normalizeText(newMessage.author);

  // Prendre les 50 dernières lignes maximum pour ne pas surcharger l'API
  let relevantRows = existingRows.slice(-50);

  // Prioriser les lignes du même auteur (les mettre en premier)
  const sameAuthorRows = relevantRows.filter(r => normalizeText(r.signalePar) === messageAuthor);
  const otherRows = relevantRows.filter(r => normalizeText(r.signalePar) !== messageAuthor);

  // Combiner : d'abord même auteur, puis les autres (limiter à 30 total)
  relevantRows = [...sameAuthorRows, ...otherRows].slice(0, 30);

  if (relevantRows.length === 0) return null;

  const prompt = `Tu analyses si un nouveau message Teams est une MISE À JOUR d'un problème déjà enregistré.

NOUVEAU MESSAGE:
De: ${newMessage.author}
Date: ${newMessage.date}
Contenu: "${newMessage.content}"

PROBLÈMES EXISTANTS (format: [index] Ligne# | Auteur | Problème | Description):
${relevantRows.map((row, i) => `[${i}] L${row.rowNumber} | ${row.signalePar} | ${row.probleme} | ${(row.description || '').substring(0, 150)}`).join('\n')}

RÈGLES IMPORTANTES:
1. C'est une MISE À JOUR si le message dit "par rapport à", "suite à", "concernant mon message", "voici le numéro", etc.
2. C'est une MISE À JOUR si le même auteur ajoute des infos (numéro de commande, précision, etc.)
3. C'est une MISE À JOUR si le message fait référence au même problème/commande/client
4. PRIVILÉGIE les lignes du MÊME AUTEUR et du MÊME JOUR
5. C'est un NOUVEAU problème si c'est un sujet différent OU un jour différent

Réponds UNIQUEMENT en JSON (sans backticks):
{
  "isUpdate": true ou false,
  "relatedIndex": numéro de l'index si isUpdate=true, sinon null,
  "reason": "explication courte"
}`;

  try {
    const response = UrlFetchApp.fetch('https://api.openai.com/v1/chat/completions', {
      method: 'post',
      headers: {
        'Authorization': 'Bearer ' + OPENAI_API_KEY,
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'Tu analyses des messages de support pour détecter les mises à jour. Réponds uniquement en JSON.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.2,
        max_tokens: 150
      }),
      muteHttpExceptions: true
    });

    const result = JSON.parse(response.getContentText());
    if (result.error) {
      Logger.log('OpenAI error in findRelatedRow: ' + JSON.stringify(result.error));
      return null;
    }

    const content = result.choices[0].message.content.trim();
    const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const analysis = JSON.parse(jsonStr);

    Logger.log('Update analysis: ' + JSON.stringify(analysis));

    if (analysis.isUpdate && analysis.relatedIndex !== null && analysis.relatedIndex < relevantRows.length) {
      const targetRow = relevantRows[analysis.relatedIndex];

      // Vérifier que les messages sont du même jour
      if (!isSameDay(newMessage.date, targetRow.date)) {
        Logger.log(`Update rejected: dates differ (${newMessage.date} vs ${targetRow.date})`);
        return null;
      }

      return {
        rowNumber: targetRow.rowNumber,
        rowData: targetRow,
        reason: analysis.reason
      };
    }

    return null;
  } catch (error) {
    Logger.log('Error in findRelatedRow: ' + error.toString());
    return null;
  }
}

/**
 * Analyse plusieurs messages en batch pour optimiser les appels API
 */
function analyzeMessagesInBatch(messages) {
  const prompt = `Tu analyses des messages du support de la Comédie-Française (système billetterie RNDV).

Messages à analyser:
${messages.map((m, i) => `[${i + 1}] De ${m.author}: "${m.content}"`).join('\n\n')}

Tu dois choisir UNIQUEMENT parmi ces valeurs exactes:

URGENCE: ${URGENCES.join(' | ')}

CATÉGORIE: ${CATEGORIES.join(' | ')}

PROBLÈME (choisis le plus proche parmi): ${PROBLEMES.slice(0, 30).join(' | ')} ... et autres types similaires

STATUT: ${STATUTS.join(' | ')}

RÈGLES URGENCE:
- Critique = urgent (<24h), bloquant, représentation imminente
- Majeur = important mais pas immédiat
- Mineur = demande simple, fusion, modification email

RÈGLE D'INCLUSION (SOIS TRÈS STRICT - par défaut isSupport: false):
isSupport: false OBLIGATOIRE si:
- Message court (Merci, OK, Bonjour, Bonne soirée, D'accord, Parfait)
- Réponse/confirmation ("La fusion est faite", "C'est corrigé", "c'est fait")
- Cite un message ("Prénom Nom JJ/MM/AAAA")
- Réponse du support ("Bonjour [Prénom]", "Je te tiendrai au courant")
- Remerciements ("Merci Bonne soirée", "Merci beaucoup")

isSupport: true UNIQUEMENT si:
- "help" + problème concret
- OU demande action ("pouvez-vous", "merci de", "il faudrait", "possible de")
- OU signale problème ("je n'ai plus accès", "erreur", "bloqué")

Réponds UNIQUEMENT en tableau JSON (sans backticks ni markdown):
[{"index":1,"isSupport":true,"urgence":"...","categorie":"...","probleme":"...","commande":"...","statut":"Nouveau"}]`;

  try {
    const response = UrlFetchApp.fetch('https://api.openai.com/v1/chat/completions', {
      method: 'post',
      headers: {
        'Authorization': 'Bearer ' + OPENAI_API_KEY,
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Tu es un assistant qui analyse des messages de support pour un système de billetterie. Tu extrais les informations clés. Réponds uniquement en JSON valide (un tableau).'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 1000
      }),
      muteHttpExceptions: true
    });

    const result = JSON.parse(response.getContentText());

    if (result.error) {
      Logger.log('OpenAI API error: ' + JSON.stringify(result.error));
      return null;
    }

    const content = result.choices[0].message.content.trim();
    Logger.log('OpenAI batch response: ' + content);

    let jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(jsonStr);

  } catch (error) {
    Logger.log('Error calling OpenAI batch: ' + error.toString());
    return null;
  }
}

function doPost(e) {
  try {
    Logger.log('POST received');

    let data;
    if (e.postData && e.postData.contents) {
      data = JSON.parse(e.postData.contents);
    } else if (e.parameter && e.parameter.data) {
      data = JSON.parse(e.parameter.data);
    } else {
      throw new Error('No data received');
    }

    const messages = data.messages;
    Logger.log('Messages count: ' + messages.length);

    if (!messages || !Array.isArray(messages)) {
      throw new Error('Invalid messages format');
    }

    // Ouvrir la spreadsheet
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = spreadsheet.getActiveSheet();

    // Trouver la dernière ligne avec des données
    const lastRow = sheet.getLastRow();
    Logger.log('Last row with data: ' + lastRow);

    // Récupérer les données existantes pour éviter les doublons
    // On compare sur : DESCRIPTION (col 5) + SIGNALÉ PAR (col 7) - normalisés
    const existingKeys = new Set();
    if (lastRow > 1) {
      const existingData = sheet.getRange(2, 1, lastRow - 1, 10).getValues();
      existingData.forEach(row => {
        // Normaliser : lowercase, supprimer espaces multiples, garder 150 premiers caractères
        const description = normalizeText(row[4]);
        const author = normalizeText(row[6]);

        if (description) {
          // Clé principale : auteur + description normalisée
          const key = `${author}|${description}`;
          existingKeys.add(key);

          // Clé secondaire : juste la description (au cas où l'auteur diffère légèrement)
          existingKeys.add(`|${description}`);
        }
      });
    }
    Logger.log('Existing unique entries: ' + existingKeys.size);

    // Date du jour au format DD/MM/YYYY
    const today = Utilities.formatDate(new Date(), 'Europe/Paris', 'dd/MM/yyyy');

    // Récupérer les lignes existantes pour détecter les mises à jour
    let existingRowsData = [];
    if (lastRow > 1) {
      const existingData = sheet.getRange(2, 1, lastRow - 1, 11).getValues();
      existingRowsData = existingData.map((row, idx) => ({
        rowNumber: idx + 2,
        date: row[0],
        urgence: row[1],
        categorie: row[2],
        probleme: row[3],
        description: row[4],
        commande: row[5],
        signalePar: row[6],
        canal: row[7],
        statut: row[8],
        commentaire: row[9],
        clickupId: row[10]
      }));
    }

    // Préparer les messages à analyser (sans doublons)
    const messagesToAnalyze = [];
    const messagesToUpdate = []; // Messages qui mettent à jour des lignes existantes
    let skippedCount = 0;

    messages.forEach(msg => {
      // Utiliser la date du message si disponible, sinon date du jour
      let messageDate = today;
      if (msg.date) {
        messageDate = msg.date;
      }

      const content = msg.content || '';
      const author = msg.author || '';

      // Normaliser pour la comparaison des doublons exacts
      const normalizedContent = normalizeText(content);
      const normalizedAuthor = normalizeText(author);

      // Créer les clés pour vérifier les doublons exacts
      const keyWithAuthor = `${normalizedAuthor}|${normalizedContent}`;
      const keyWithoutAuthor = `|${normalizedContent}`;

      // Vérifier si ce message existe déjà exactement (doublon)
      if (existingKeys.has(keyWithAuthor) || existingKeys.has(keyWithoutAuthor)) {
        Logger.log('Skipping exact duplicate: ' + content.substring(0, 60) + '...');
        skippedCount++;
        return;
      }

      // Ignorer les messages qui citent un message précédent (format: "Prénom Nom JJ/MM/AAAA")
      if (isQuotedMessage(content)) {
        Logger.log('Skipping quoted message: ' + content.substring(0, 60) + '...');
        skippedCount++;
        return;
      }

      // Ignorer les messages simples (merci, bonjour, bonne soirée, etc.)
      if (isSimpleNonSupportMessage(content)) {
        Logger.log('Skipping simple message: ' + content.substring(0, 60) + '...');
        skippedCount++;
        return;
      }

      // Ajouter les clés pour éviter les doublons dans le même batch
      existingKeys.add(keyWithAuthor);
      existingKeys.add(keyWithoutAuthor);

      const msgData = {
        date: messageDate,
        time: msg.time || '',
        author: author,
        content: content
      };

      // Vérifier si c'est une mise à jour d'un message existant
      if (existingRowsData.length > 0) {
        const updateInfo = findRelatedRow(msgData, existingRowsData);
        if (updateInfo) {
          Logger.log(`Message is an update for row ${updateInfo.rowNumber}: ${updateInfo.reason}`);
          messagesToUpdate.push({
            ...msgData,
            targetRow: updateInfo.rowNumber,
            existingData: updateInfo.rowData,
            updateReason: updateInfo.reason
          });
          return;
        }
      }

      // Sinon, c'est un nouveau message
      messagesToAnalyze.push(msgData);
    });

    Logger.log('Messages to analyze (new): ' + messagesToAnalyze.length);
    Logger.log('Messages to update: ' + messagesToUpdate.length);
    Logger.log('Skipped duplicates: ' + skippedCount);

    // Analyser les messages avec OpenAI (en batch si plusieurs)
    let aiAnalysis = null;
    if (messagesToAnalyze.length > 0) {
      if (messagesToAnalyze.length === 1) {
        // Analyse individuelle
        const analysis = analyzeMessageWithAI(messagesToAnalyze[0].content, messagesToAnalyze[0].author);
        if (analysis) {
          const validated = validateAnalysis(analysis);
          aiAnalysis = [{ index: 1, ...validated }];
        }
      } else {
        // Analyse en batch
        const batchResult = analyzeMessagesInBatch(messagesToAnalyze);
        if (batchResult && Array.isArray(batchResult)) {
          aiAnalysis = batchResult.map(a => ({ ...a, ...validateAnalysis(a) }));
        }
      }
      Logger.log('AI Analysis result (validated): ' + JSON.stringify(aiAnalysis));
    }

    // Construire les lignes avec les données analysées
    // Filtrer les messages non-support (salutations, conversations casual)
    const newRows = [];
    let ignoredNonSupport = 0;

    messagesToAnalyze.forEach((msg, index) => {
      // Pas d'analyse IA = on n'ajoute pas
      if (!aiAnalysis) {
        Logger.log('No AI analysis available, skipping: ' + msg.content.substring(0, 50));
        ignoredNonSupport++;
        return;
      }

      const analysis = aiAnalysis.find(a => a.index === index + 1) || aiAnalysis[index];

      // Pas d'analyse pour ce message = on n'ajoute pas
      if (!analysis) {
        Logger.log('No analysis for message, skipping: ' + msg.content.substring(0, 50));
        ignoredNonSupport++;
        return;
      }

      // IA dit non-support = on n'ajoute pas
      if (analysis.isSupport === false) {
        Logger.log('Ignoring non-support message: ' + msg.content.substring(0, 50));
        ignoredNonSupport++;
        return;
      }

      // IA dit support = on ajoute avec les valeurs de l'analyse
      newRows.push([
        msg.date,                         // DATE
        analysis.urgence || '',           // URGENCE / IMPACT
        analysis.categorie || '',         // CATÉGORIE
        analysis.probleme || '',          // PROBLÈME
        cleanMessageContent(msg.content), // DESCRIPTION
        analysis.commande || '',          // COMMANDE
        msg.author,                       // SIGNALÉ PAR
        'Chat',                           // CANAL
        analysis.statut || 'Nouveau',     // STATUT
        ''                                // COMMENTAIRE
      ]);
    });

    Logger.log('Messages ignored (non-support): ' + ignoredNonSupport);

    // Ajouter les nouvelles lignes à la fin
    if (newRows.length > 0) {
      const startRow = lastRow + 1;
      sheet.getRange(startRow, 1, newRows.length, 10).setValues(newRows);

      // Aligner la colonne DATE à gauche
      sheet.getRange(startRow, 1, newRows.length, 1).setHorizontalAlignment('left');

      Logger.log('Added ' + newRows.length + ' rows starting at row ' + startRow);
    }

    // Traiter les mises à jour de lignes existantes
    let updatedCount = 0;
    if (messagesToUpdate.length > 0) {
      messagesToUpdate.forEach(update => {
        try {
          const targetRow = update.targetRow;
          const existingCommentaire = sheet.getRange(targetRow, 10).getValue() || '';
          const existingAuthor = sheet.getRange(targetRow, 7).getValue() || '';

          // Construire le nouveau commentaire avec la mise à jour
          const cleanContent = cleanMessageContent(update.content);
          const updateNote = `[MAJ ${update.date}] ${update.author}: ${cleanContent.substring(0, 100)}${cleanContent.length > 100 ? '...' : ''}`;

          // Ajouter au commentaire existant (avec séparateur si déjà du contenu)
          let newCommentaire = existingCommentaire;
          if (existingCommentaire) {
            newCommentaire += '\n---\n' + updateNote;
          } else {
            newCommentaire = updateNote;
          }

          // Mettre à jour la cellule COMMENTAIRE
          sheet.getRange(targetRow, 10).setValue(newCommentaire);

          // Mettre à jour SIGNALÉ PAR si l'auteur est différent
          if (update.author && normalizeText(update.author) !== normalizeText(existingAuthor)) {
            // Ajouter le nouvel auteur (ne pas écraser l'original)
            if (existingAuthor && !existingAuthor.includes(update.author)) {
              sheet.getRange(targetRow, 7).setValue(existingAuthor + ', ' + update.author);
              Logger.log(`Added author ${update.author} to row ${targetRow}`);
            } else if (!existingAuthor) {
              sheet.getRange(targetRow, 7).setValue(update.author);
              Logger.log(`Set author ${update.author} for row ${targetRow}`);
            }
          }

          Logger.log(`Updated row ${targetRow} with new comment: ${updateNote.substring(0, 50)}...`);
          updatedCount++;
        } catch (updateError) {
          Logger.log('Error updating row ' + update.targetRow + ': ' + updateError.toString());
        }
      });

      Logger.log('Updated ' + updatedCount + ' existing rows');
    }

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      rowsAdded: newRows.length,
      rowsUpdated: updatedCount,
      rowsSkipped: skippedCount,
      rowsIgnored: ignoredNonSupport,
      aiAnalyzed: aiAnalysis ? true : false,
      startRow: newRows.length > 0 ? lastRow + 1 : null
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    Logger.log('Error: ' + error.toString());
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  if (e && e.parameter && e.parameter.data) {
    return doPost({ postData: { contents: e.parameter.data }, parameter: e.parameter });
  }

  return ContentService.createTextOutput(JSON.stringify({
    status: 'ok',
    message: 'Teams Exporter API v2 - Append mode (no delete)',
    spreadsheet: 'https://docs.google.com/spreadsheets/d/' + SPREADSHEET_ID,
    columns: ['DATE', 'URGENCE / IMPACT', 'CATÉGORIE', 'PROBLÈME', 'DESCRIPTION', 'COMMANDE', 'SIGNALÉ PAR', 'CANAL', 'STATUT', 'COMMENTAIRE']
  })).setMimeType(ContentService.MimeType.JSON);
}

// Fonction de test avec les vrais exemples de messages
function testWrite() {
  const testData = {
    postData: {
      contents: JSON.stringify({
        messages: [
          {
            date: '18/01/2026',
            time: '10:30',
            author: 'Schiattarere',
            content: 'Bonjour help, possible de fusionner les deux fiches ? JORDAN PEREZ - Clients - Clients - RNDV et Jordan Perez - Clients - Clients - RNDV merci !'
          },
          {
            date: '18/01/2026',
            time: '11:15',
            author: 'Schiattarere',
            content: 'Bonjour help, pouvez-vous modifier l\'adresse mail erronée de la Commande N°W.2601.K6CGC la bonne adresse (déjà enregistrée) étant freferiquedesercey19@gmail.com ? Avec mes remerciements.'
          },
          {
            date: '18/01/2026',
            time: '14:00',
            author: 'Schiattarere',
            content: 'Bonjour help, Je ne retrouve aucune trace de la commande numéro RM.20210.XZCZK. Pourtant les deux places pour Les Femmes savantes au vendredi 23 janvier sont bien réservées sur le plan de salle et sont associées à ce numéro de commande. Pourriez-vous résoudre ce mystère ? Merci beaucoup !'
          },
          {
            date: '18/01/2026',
            time: '15:30',
            author: 'Support',
            content: 'Bonjour, problèmes sur une commande C2H86 payé en chèque cadeau en partie mais la spectatrice veut l\'annuler, elle a une autre commande en brouillon GHVKQ payer en partie en chèque cadeau qu\'elle veut garder commande pour le 25/01 Chèque Z695-W701-U815 : 5€ Chèque H941-V648-U164 : 50€'
          }
        ]
      })
    }
  };

  const result = doPost(testData);
  const response = JSON.parse(result.getContent());
  Logger.log('=== RESULT ===');
  Logger.log('Rows added: ' + response.rowsAdded);
  Logger.log('Rows skipped: ' + response.rowsSkipped);
  Logger.log('AI analyzed: ' + response.aiAnalyzed);
  Logger.log('Full response: ' + JSON.stringify(response));
}

// Test de l'analyse OpenAI seule avec un message complexe
function testOpenAI() {
  const messages = [
    {
      author: 'Schiattarere',
      content: 'Bonjour help, possible de fusionner les deux fiches ? JORDAN PEREZ - Clients - Clients - RNDV et Jordan Perez - Clients - Clients - RNDV merci !'
    },
    {
      author: 'Support',
      content: 'Bonjour, problèmes sur une commande C2H86 payé en chèque cadeau en partie mais la spectatrice veut l\'annuler, elle a une autre commande en brouillon GHVKQ qu\'elle veut garder. Chèque Z695-W701-U815 : 5€'
    }
  ];

  Logger.log('=== Test analyse individuelle ===');
  const result1 = analyzeMessageWithAI(messages[0].content, messages[0].author);
  Logger.log('Message 1: ' + JSON.stringify(result1));

  Logger.log('=== Test analyse batch ===');
  const resultBatch = analyzeMessagesInBatch(messages);
  Logger.log('Batch result: ' + JSON.stringify(resultBatch));
}

// Fonction pour voir les dernières lignes ajoutées
function checkLastRows() {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = spreadsheet.getActiveSheet();
  const lastRow = sheet.getLastRow();

  Logger.log('Total rows: ' + lastRow);

  // Afficher les 5 dernières lignes
  if (lastRow > 0) {
    const startRow = Math.max(1, lastRow - 4);
    const data = sheet.getRange(startRow, 1, lastRow - startRow + 1, 10).getValues();
    data.forEach((row, index) => {
      Logger.log('Row ' + (startRow + index) + ': ' + JSON.stringify(row));
    });
  }
}

// =====================================================
// CLICKUP INTEGRATION
// =====================================================

/**
 * Trigger automatique lors de la modification d'une cellule
 * IMPORTANT: Exécuter installEditTrigger() une fois pour activer ce trigger
 */
function onEditTrigger(e) {
  try {
    Logger.log('=== onEditTrigger called ===');

    if (!e) {
      Logger.log('Error: event object is undefined');
      return;
    }

    const sheet = e.source.getActiveSheet();
    const range = e.range;
    const row = range.getRow();
    const col = range.getColumn();

    Logger.log(`Edit detected: row=${row}, col=${col}`);

    // Colonne STATUT = 9, ignorer la ligne d'en-tête
    if (col !== 9) {
      Logger.log(`Column ${col} is not STATUT column (9), skipping`);
      return;
    }

    if (row < 2) {
      Logger.log('Header row, skipping');
      return;
    }

    // Récupérer la valeur directement de la cellule (plus fiable avec les listes déroulantes)
    const newStatus = sheet.getRange(row, col).getValue();
    const oldStatus = e.oldValue || '';

    Logger.log(`Status value in cell: "${newStatus}"`);
    Logger.log(`Status changed from "${oldStatus}" to "${newStatus}" at row ${row}`);

    // Vérifier si le nouveau statut est exactement "En cours d'investigation"
    if (newStatus !== CLICKUP_TRIGGER_STATUS) {
      Logger.log(`Status "${newStatus}" does not trigger ClickUp creation`);
      return;
    }

    // Vérifier si une tâche ClickUp existe déjà (colonne K = 11)
    const clickupTaskId = sheet.getRange(row, 11).getValue();

    if (clickupTaskId && clickupTaskId.toString().trim() !== '') {
      Logger.log(`ClickUp task already exists for row ${row}: ${clickupTaskId} - skipping`);
      return;
    }

    // Récupérer les données de la ligne
    const rowData = sheet.getRange(row, 1, 1, 10).getValues()[0];
    const taskData = {
      date: rowData[0],
      urgence: rowData[1],
      categorie: rowData[2],
      probleme: rowData[3],
      description: rowData[4],
      commande: rowData[5],
      signalePar: rowData[6],
      canal: rowData[7],
      statut: newStatus,
      commentaire: rowData[9]
    };

    // Créer la tâche ClickUp
    const taskId = createClickUpTask(taskData, row);

    if (taskId) {
      // Sauvegarder l'ID de la tâche dans la colonne K
      sheet.getRange(row, 11).setValue(taskId);
      Logger.log(`ClickUp task created: ${taskId} for row ${row}`);

      // Optionnel: ajouter un lien vers la tâche dans une note
      SpreadsheetApp.getActiveSpreadsheet().toast(
        `Tâche ClickUp créée: ${taskId}`,
        'ClickUp',
        5
      );
    }
  } catch (error) {
    Logger.log('Error in onEditTrigger: ' + error.toString());
  }
}

/**
 * Crée une tâche dans ClickUp
 */
function createClickUpTask(data, rowNumber) {
  try {
    // Validation des données
    if (!data) {
      Logger.log('Error: data is undefined');
      return null;
    }

    Logger.log('Creating ClickUp task with data: ' + JSON.stringify(data));

    // Construire le titre de la tâche
    const categorie = data.categorie || 'Autre';
    const probleme = data.probleme || 'Sans titre';
    const title = `[${categorie}] ${probleme}`;

    // Construire la description
    const signalePar = data.signalePar || 'Inconnu';
    const date = data.date || '';
    const canal = data.canal || 'Chat';
    const commande = data.commande || '';
    const descriptionText = data.description || '';
    const commentaire = data.commentaire || '';

    let description = `**Signalé par:** ${signalePar}\n`;
    description += `**Date:** ${date}\n`;
    description += `**Canal:** ${canal}\n`;
    if (commande) {
      description += `**Commande(s):** ${commande}\n`;
    }
    description += `\n---\n\n**Description:**\n${descriptionText}`;
    if (commentaire) {
      description += `\n\n**Commentaire:** ${commentaire}`;
    }
    description += `\n\n---\n*Ligne Google Sheet: ${rowNumber}*`;

    // Mapper la priorité
    const urgence = data.urgence || 'Mineur';
    const priority = PRIORITY_MAP[urgence] || 3;

    const payload = {
      name: title,
      description: description,
      priority: priority,
      status: 'not started',
      tags: [categorie, 'RNDV', 'Teams'].filter(t => t)
    };

    const response = UrlFetchApp.fetch(`https://api.clickup.com/api/v2/list/${CLICKUP_LIST_ID}/task`, {
      method: 'post',
      headers: {
        'Authorization': CLICKUP_API_KEY,
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });

    const result = JSON.parse(response.getContentText());

    if (result.err) {
      Logger.log('ClickUp API error: ' + JSON.stringify(result));
      return null;
    }

    Logger.log('ClickUp task created: ' + result.id + ' - ' + result.name);
    return result.id;

  } catch (error) {
    Logger.log('Error creating ClickUp task: ' + error.toString());
    return null;
  }
}

/**
 * Test manuel du trigger pour une ligne spécifique
 * Changez le numéro de ligne ci-dessous et exécutez cette fonction
 */
function testTriggerForRow() {
  const ROW_TO_TEST = 2; // <-- Changez ce numéro pour tester une autre ligne

  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = spreadsheet.getActiveSheet();

  const status = sheet.getRange(ROW_TO_TEST, 9).getValue();
  Logger.log(`Row ${ROW_TO_TEST} - Current status: "${status}"`);

  if (status === CLICKUP_TRIGGER_STATUS) {
    Logger.log('Status matches trigger condition!');

    // Vérifier si tâche déjà créée
    const existingTaskId = sheet.getRange(ROW_TO_TEST, 11).getValue();
    if (existingTaskId) {
      Logger.log(`Task already exists: ${existingTaskId}`);
      return;
    }

    // Récupérer les données
    const rowData = sheet.getRange(ROW_TO_TEST, 1, 1, 10).getValues()[0];
    Logger.log('Row data: ' + JSON.stringify(rowData));

    const taskData = {
      date: rowData[0],
      urgence: rowData[1],
      categorie: rowData[2],
      probleme: rowData[3],
      description: rowData[4],
      commande: rowData[5],
      signalePar: rowData[6],
      canal: rowData[7],
      statut: status,
      commentaire: rowData[9]
    };

    // Créer la tâche
    const taskId = createClickUpTask(taskData, ROW_TO_TEST);

    if (taskId) {
      sheet.getRange(ROW_TO_TEST, 11).setValue(taskId);
      Logger.log(`Task created: ${taskId}`);
    }
  } else {
    Logger.log(`Status "${status}" does not match trigger "${CLICKUP_TRIGGER_STATUS}"`);
  }
}

/**
 * Test de création de tâche ClickUp
 */
function testClickUpTask() {
  const testData = {
    date: '18/01/2026',
    urgence: 'Majeur',
    categorie: 'Commandes',
    probleme: 'Commande non présente',
    description: 'Test de création de tâche depuis Google Sheets. La commande W.2601.TEST n\'apparaît pas dans le système.',
    commande: 'W.2601.TEST',
    signalePar: 'Test User',
    canal: 'Teams',
    statut: 'En cours d\'investigation',
    commentaire: '14:30'
  };

  const taskId = createClickUpTask(testData, 999);
  Logger.log('Test task ID: ' + taskId);
}

/**
 * Vérifie si le trigger est installé
 */
function checkTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  Logger.log('=== Installed Triggers ===');
  Logger.log('Total triggers: ' + triggers.length);

  triggers.forEach((trigger, index) => {
    Logger.log(`Trigger ${index + 1}: ${trigger.getHandlerFunction()} - ${trigger.getEventType()}`);
  });

  if (triggers.length === 0) {
    Logger.log('No triggers installed! Run installEditTrigger()');
  }
}

/**
 * Installe le trigger onEdit automatiquement
 */
function installEditTrigger() {
  // Supprimer les anciens triggers onEditTrigger
  const triggers = ScriptApp.getProjectTriggers();
  let removed = 0;
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'onEditTrigger') {
      ScriptApp.deleteTrigger(trigger);
      removed++;
    }
  });
  Logger.log('Removed ' + removed + ' old triggers');

  // Créer le nouveau trigger
  ScriptApp.newTrigger('onEditTrigger')
    .forSpreadsheet(SPREADSHEET_ID)
    .onEdit()
    .create();

  Logger.log('Edit trigger installed successfully!');

  // Vérifier/Ajouter la colonne ClickUp Task ID
  ensureClickUpColumn();

  // Afficher les triggers
  checkTriggers();
}

/**
 * S'assure que la colonne ClickUp Task ID existe (colonne K)
 */
function ensureClickUpColumn() {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = spreadsheet.getActiveSheet();

  // Vérifier si la colonne K a un header
  const headerK = sheet.getRange(1, 11).getValue();

  if (!headerK || headerK !== 'CLICKUP_TASK_ID') {
    sheet.getRange(1, 11).setValue('CLICKUP_TASK_ID');
    sheet.getRange(1, 11).setFontWeight('bold');
    sheet.getRange(1, 11).setBackground('#667eea');
    sheet.getRange(1, 11).setFontColor('#ffffff');
    Logger.log('ClickUp Task ID column added');
  }
}

/**
 * Supprime les doublons existants dans la feuille (garder la première occurrence)
 * ATTENTION: Exécuter manuellement si nécessaire
 */
function removeDuplicates() {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = spreadsheet.getActiveSheet();
  const lastRow = sheet.getLastRow();

  if (lastRow <= 1) {
    Logger.log('No data to process');
    return;
  }

  const data = sheet.getRange(2, 1, lastRow - 1, 10).getValues();
  const seen = new Set();
  const rowsToDelete = [];

  data.forEach((row, index) => {
    const description = normalizeText(row[4]);
    const author = normalizeText(row[6]);
    const key = `${author}|${description}`;

    if (description && seen.has(key)) {
      rowsToDelete.push(index + 2); // +2 car on commence à la ligne 2
      Logger.log('Duplicate found at row ' + (index + 2) + ': ' + description.substring(0, 50));
    } else if (description) {
      seen.add(key);
    }
  });

  // Supprimer les lignes en partant de la fin pour ne pas décaler les indices
  Logger.log('Found ' + rowsToDelete.length + ' duplicates to remove');

  for (let i = rowsToDelete.length - 1; i >= 0; i--) {
    sheet.deleteRow(rowsToDelete[i]);
  }

  Logger.log('Removed ' + rowsToDelete.length + ' duplicate rows');
}
