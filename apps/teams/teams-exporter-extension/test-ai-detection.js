#!/usr/bin/env node
/**
 * Script de test pour vérifier la détection des messages de support
 * Inclut le pré-filtrage (code) ET l'analyse IA
 *
 * Usage:
 *   node test-ai-detection.js "Votre message à tester"
 *   node test-ai-detection.js (mode interactif)
 */

const readline = require('readline');
require('dotenv').config();

// Charger les clés depuis .env
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  console.error('OPENAI_API_KEY non trouvee dans .env');
  console.log('Creez un fichier .env avec: OPENAI_API_KEY=sk-...');
  process.exit(1);
}

// =====================================================
// FONCTIONS DE PRE-FILTRAGE (identiques à google-apps-script.js)
// =====================================================

/**
 * Vérifie si un message est une citation (contient un identifiant + date)
 */
function isQuotedMessage(content) {
  if (!content) return false;
  // Pattern 1: Prénom Nom DD/MM/YYYY
  const pattern1 = /[A-ZÀ-Ý][a-zà-ÿ]+\s+[A-ZÀ-Ý][a-zà-ÿ]+\s+\d{2}\/\d{2}\/\d{4}/;
  // Pattern 2: identifiant.style DD/MM/YYYY (ex: marine.trehorel 18/01/2026)
  const pattern2 = /[a-zA-Z][a-zA-Z0-9._-]+\s+\d{2}\/\d{2}\/\d{4}/;
  return pattern1.test(content) || pattern2.test(content);
}

/**
 * Vérifie si un message est un message simple à ignorer
 */
function isSimpleNonSupportMessage(content) {
  if (!content) return true;

  const cleaned = content.toLowerCase().trim()
    .replace(/[\r\n]+/g, ' ')
    .replace(/\s+/g, ' ');

  const supportKeywords = ['help', 'problème', 'probleme', 'erreur', 'bug', 'bloqué', 'bloque',
    'fusionner', 'fusion', 'modifier', 'commande', 'accès', 'acces', 'impossible',
    'pouvez-vous', 'pouvez vous', 'merci de', 'il faudrait', 'possible de', 'svp', 's\'il vous plaît'];

  const hasKeyword = supportKeywords.some(kw => cleaned.includes(kw));

  const ignoreExact = [
    'merci', 'merci !', 'merci!', 'merci beaucoup', 'ok', 'okay', 'd\'accord', 'daccord',
    'parfait', 'super', 'top', 'génial', 'genial', 'cool', 'nickel', 'impeccable',
    'bonjour', 'bonsoir', 'salut', 'coucou', 'hello', 'hi',
    'bonne journée', 'bonne journee', 'bonne soirée', 'bonne soiree', 'bon week-end', 'bon weekend',
    'à bientôt', 'a bientot', 'à plus', 'a plus', 'bye', 'ciao',
    'oui', 'non', 'c\'est bon', 'c\'est fait', 'c\'est noté', 'noté', 'note',
    'je te remercie', 'je vous remercie'
  ];

  const ignoreStartsWith = [
    'merci ', 'bonjour,', 'bonsoir,', 'salut,', 'ok ', 'okay ',
    'bonne ', 'bon ', 'super ', 'parfait ', 'génial ', 'top '
  ];

  if (ignoreExact.includes(cleaned)) {
    return true;
  }

  if (!hasKeyword) {
    for (const prefix of ignoreStartsWith) {
      if (cleaned.startsWith(prefix) && cleaned.length < 50) {
        return true;
      }
    }
    if (cleaned.length < 25) {
      return true;
    }
  }

  return false;
}

// =====================================================
// LISTES DE REFERENCE
// =====================================================

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
  'Nouveau', 'Correction technique', 'Correction manuelle', "En cours d'investigation",
  'En cours de correction', 'Corrigé', 'Non lié au système', 'Vérification', 'En attente'
];

// =====================================================
// ANALYSE IA
// =====================================================

async function analyzeMessage(messageContent, author = 'Utilisateur') {
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
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Tu es un assistant qui analyse des messages de support pour un système de billetterie (Comédie-Française). Tu extrais les informations clés et les catégorises. Réponds uniquement en JSON valide. SOIS STRICT: par défaut isSupport=false.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 200
      })
    });

    const result = await response.json();

    if (result.error) {
      console.error('Erreur OpenAI:', result.error.message);
      return null;
    }

    const content = result.choices[0].message.content.trim();
    const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(jsonStr);

  } catch (error) {
    console.error('Erreur:', error.message);
    return null;
  }
}

// =====================================================
// AFFICHAGE
// =====================================================

function displayResult(message, preFilterResult, aiResult) {
  console.log('\n' + '='.repeat(60));
  console.log('MESSAGE:');
  console.log(`   "${message}"`);
  console.log('='.repeat(60));

  // Pré-filtrage
  console.log('\n[1] PRE-FILTRAGE (code):');
  if (preFilterResult.isQuoted) {
    console.log('   -> IGNORE: Message cite un autre message (Prenom Nom Date)');
  } else if (preFilterResult.isSimple) {
    console.log('   -> IGNORE: Message simple (merci, bonjour, etc.)');
  } else {
    console.log('   -> PASSE: Envoyé à l\'IA pour analyse');
  }

  // IA
  if (!preFilterResult.isQuoted && !preFilterResult.isSimple) {
    console.log('\n[2] ANALYSE IA:');
    if (!aiResult) {
      console.log('   -> ERREUR: Impossible d\'analyser');
    } else {
      const supportIcon = aiResult.isSupport ? 'OUI' : 'NON';
      console.log(`   -> isSupport: ${supportIcon}`);

      if (aiResult.isSupport) {
        console.log(`   -> Urgence:   ${aiResult.urgence || 'N/A'}`);
        console.log(`   -> Catégorie: ${aiResult.categorie || 'N/A'}`);
        console.log(`   -> Problème:  ${aiResult.probleme || 'N/A'}`);
        console.log(`   -> Commande:  ${aiResult.commande || '(aucune)'}`);
        console.log(`   -> Statut:    ${aiResult.statut || 'Nouveau'}`);
      }
    }
  }

  // Résultat final
  console.log('\n[RESULTAT FINAL]:');
  if (preFilterResult.isQuoted || preFilterResult.isSimple) {
    console.log('   -> IGNORE (filtre code)');
  } else if (!aiResult || !aiResult.isSupport) {
    console.log('   -> IGNORE (IA: non-support)');
  } else {
    console.log('   -> AJOUTE AU SHEET');
  }

  console.log('\n' + '='.repeat(60));
}

// =====================================================
// MODES
// =====================================================

async function testMessage(message) {
  // Pré-filtrage
  const preFilterResult = {
    isQuoted: isQuotedMessage(message),
    isSimple: isSimpleNonSupportMessage(message)
  };

  let aiResult = null;

  // Si passe le pré-filtre, envoyer à l'IA
  if (!preFilterResult.isQuoted && !preFilterResult.isSimple) {
    console.log('\nAnalyse IA en cours...');
    aiResult = await analyzeMessage(message);
  }

  displayResult(message, preFilterResult, aiResult);
}

async function interactiveMode() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const question = (prompt) => new Promise(resolve => rl.question(prompt, resolve));

  console.log('\nTEST DE DETECTION - Mode Interactif');
  console.log('Tapez "exit" pour quitter\n');

  while (true) {
    const message = await question('\nEntrez un message a tester:\n> ');

    if (message.toLowerCase() === 'exit') {
      console.log('\nAu revoir!');
      rl.close();
      break;
    }

    if (!message.trim()) {
      continue;
    }

    await testMessage(message);
  }
}

async function runExamples() {
  console.log('\n=== TEST AVEC EXEMPLES ===\n');

  const examples = [
    // Devrait être IGNORE
    'Merci Bonne soirée',
    'Bonjour',
    'OK parfait',
    'Stephen Cornet 16/01/2026 12:11 Bonjour il faudrait fusionner ces 2 fiches',
    'La fusion est faite. Merci !',
    'Je te tiendrai au courant !',

    // Devrait être SUPPORT
    'Bonjour help, possible de fusionner les deux fiches ? JORDAN PEREZ et Jordan Perez merci !',
    'Je n\'ai plus accès au contingent spécial merci de me le remettre',
    'Bonjour help pouvez-vous modifier l\'adresse mail de la Commande N°W.2601.K6CGC'
  ];

  for (const msg of examples) {
    await testMessage(msg);
    console.log('\n');
  }
}

// Point d'entrée
const args = process.argv.slice(2);

if (args[0] === '--examples') {
  runExamples();
} else if (args.length > 0) {
  testMessage(args.join(' '));
} else {
  interactiveMode();
}
