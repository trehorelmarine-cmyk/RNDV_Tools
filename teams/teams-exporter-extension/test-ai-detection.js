#!/usr/bin/env node
/**
 * Script de test pour vérifier la détection IA des messages de support
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
  console.error('❌ OPENAI_API_KEY non trouvée dans .env');
  console.log('Créez un fichier .env avec: OPENAI_API_KEY=sk-...');
  process.exit(1);
}

// Listes de référence (identiques à google-apps-script.js)
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

IMPORTANT - RÈGLE D'INCLUSION:
- Par DÉFAUT, considère que c'est une demande de support (isSupport: true)
- Mets isSupport: false UNIQUEMENT si le message est:
  * Une salutation SEULE ("Salut", "Bonjour", "Coucou") sans autre contenu
  * Une réponse simple ("OK", "Merci", "D'accord", "Parfait", "Super")
  * Une question sur le statut d'une demande précédente ("Où en est ma demande ?", "Des nouvelles ?")
  * Du bavardage sans rapport avec le support ("Bon week-end", "Ça va ?")

- Mets isSupport: true si le message:
  * Mentionne un problème, une erreur, un souci
  * Contient un numéro de commande, client, ou chèque cadeau
  * Demande une action (fusion, modification, vérification, annulation, remise d'accès...)
  * Décrit une situation anormale ou une perte d'accès
  * Demande des droits, accès, permissions, contingents, ou tarifs
  * Mentionne "je n'ai plus accès", "je ne peux plus", "impossible de", "je n'arrive pas"
  * Contient "help" ou s'adresse au support (mais ce n'est pas obligatoire)

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
            content: 'Tu es un assistant qui analyse des messages de support pour un système de billetterie (Comédie-Française). Tu extrais les informations clés et les catégorises. Réponds uniquement en JSON valide.'
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
      console.error('❌ Erreur OpenAI:', result.error.message);
      return null;
    }

    const content = result.choices[0].message.content.trim();
    const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(jsonStr);

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    return null;
  }
}

function displayResult(message, result) {
  console.log('\n' + '='.repeat(60));
  console.log('📝 MESSAGE:');
  console.log(`   "${message}"`);
  console.log('='.repeat(60));

  if (!result) {
    console.log('❌ Impossible d\'analyser le message');
    return;
  }

  const supportIcon = result.isSupport ? '✅' : '❌';
  const supportText = result.isSupport ? 'OUI - Demande de support' : 'NON - Pas une demande de support';

  console.log(`\n${supportIcon} IS SUPPORT: ${supportText}`);

  if (result.isSupport) {
    console.log(`\n📊 ANALYSE:`);
    console.log(`   Urgence:   ${result.urgence || 'N/A'}`);
    console.log(`   Catégorie: ${result.categorie || 'N/A'}`);
    console.log(`   Problème:  ${result.probleme || 'N/A'}`);
    console.log(`   Commande:  ${result.commande || '(aucune)'}`);
    console.log(`   Statut:    ${result.statut || 'Nouveau'}`);
  }

  console.log('\n' + '='.repeat(60));
}

async function interactiveMode() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const question = (prompt) => new Promise(resolve => rl.question(prompt, resolve));

  console.log('\n🤖 TEST DE DÉTECTION IA - Mode Interactif');
  console.log('Tapez "exit" pour quitter\n');

  while (true) {
    const message = await question('\n💬 Entrez un message à tester:\n> ');

    if (message.toLowerCase() === 'exit') {
      console.log('\n👋 Au revoir!');
      rl.close();
      break;
    }

    if (!message.trim()) {
      continue;
    }

    console.log('\n⏳ Analyse en cours...');
    const result = await analyzeMessage(message);
    displayResult(message, result);

    const feedback = await question('\n🎯 L\'IA a-t-elle raison? (o/n/skip): ');

    if (feedback.toLowerCase() === 'n') {
      const expected = await question('   Devrait être support? (o/n): ');
      const shouldBeSupport = expected.toLowerCase() === 'o';

      console.log('\n📝 FEEDBACK ENREGISTRÉ:');
      console.log(`   Message: "${message.substring(0, 50)}..."`);
      console.log(`   IA dit: isSupport=${result?.isSupport}`);
      console.log(`   Attendu: isSupport=${shouldBeSupport}`);
      console.log('\n   ➡️  Ajoutez ce cas au prompt dans google-apps-script.js');

      if (shouldBeSupport && !result?.isSupport) {
        console.log('\n   💡 SUGGESTION: Ajouter dans les règles isSupport=true:');
        // Identifier des mots-clés du message
        const keywords = message.toLowerCase().match(/\b\w{4,}\b/g) || [];
        if (keywords.length > 0) {
          console.log(`      * Messages contenant: "${keywords.slice(0, 3).join('", "')}"`);
        }
      }
    } else if (feedback.toLowerCase() === 'o') {
      console.log('   ✅ Parfait, l\'IA fonctionne correctement!');
    }
  }
}

async function singleTest(message) {
  console.log('\n⏳ Analyse en cours...');
  const result = await analyzeMessage(message);
  displayResult(message, result);
}

// Point d'entrée
const args = process.argv.slice(2);

if (args.length > 0) {
  // Mode ligne de commande avec message
  singleTest(args.join(' '));
} else {
  // Mode interactif
  interactiveMode();
}
