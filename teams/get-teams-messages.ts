import { Client } from "@microsoft/microsoft-graph-client";
import { TokenCredentialAuthenticationProvider } from "@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials";
import { ClientSecretCredential, DeviceCodeCredential } from "@azure/identity";

// Configuration Azure AD
const config = {
  tenantId: process.env.AZURE_TENANT_ID || "",
  clientId: process.env.AZURE_CLIENT_ID || "",
  clientSecret: process.env.AZURE_CLIENT_SECRET || "", // Optionnel pour device code flow
};

// Type pour les messages Teams
interface TeamsMessage {
  id: string;
  createdDateTime: string;
  from?: {
    user?: {
      displayName: string;
      id: string;
    };
  };
  body: {
    content: string;
    contentType: string;
  };
}

// Créer le client Graph avec authentification interactive (device code)
async function createGraphClientInteractive(): Promise<Client> {
  const credential = new DeviceCodeCredential({
    tenantId: config.tenantId,
    clientId: config.clientId,
    userPromptCallback: (info) => {
      console.log("\n📱 Authentification requise:");
      console.log(info.message);
    },
  });

  const authProvider = new TokenCredentialAuthenticationProvider(credential, {
    scopes: ["https://graph.microsoft.com/.default", "Chat.Read", "User.Read"],
  });

  return Client.initWithMiddleware({ authProvider });
}

// Créer le client Graph avec authentification application (client credentials)
async function createGraphClientApp(): Promise<Client> {
  const credential = new ClientSecretCredential(
    config.tenantId,
    config.clientId,
    config.clientSecret
  );

  const authProvider = new TokenCredentialAuthenticationProvider(credential, {
    scopes: ["https://graph.microsoft.com/.default"],
  });

  return Client.initWithMiddleware({ authProvider });
}

// Lister les chats disponibles
async function listChats(client: Client): Promise<void> {
  console.log("\n📋 Liste des conversations:");
  console.log("-".repeat(50));

  const chats = await client.api("/me/chats").top(20).get();

  for (const chat of chats.value) {
    const chatType = chat.chatType === "oneOnOne" ? "1:1" : "Groupe";
    const topic = chat.topic || "Sans titre";
    console.log(`  [${chatType}] ${topic} - ID: ${chat.id}`);
  }
}

// Récupérer les messages d'une conversation
async function getChatMessages(
  client: Client,
  chatId: string,
  limit: number = 50
): Promise<TeamsMessage[]> {
  console.log(`\n📨 Récupération des ${limit} derniers messages...`);

  const response = await client
    .api(`/me/chats/${chatId}/messages`)
    .top(limit)
    .orderby("createdDateTime DESC")
    .get();

  return response.value;
}

// Formater et afficher les messages
function displayMessages(messages: TeamsMessage[]): void {
  console.log("\n" + "=".repeat(60));
  console.log("📝 MESSAGES DE LA CONVERSATION");
  console.log("=".repeat(60));

  // Inverser pour afficher du plus ancien au plus récent
  const sortedMessages = [...messages].reverse();

  for (const msg of sortedMessages) {
    const date = new Date(msg.createdDateTime);
    const formattedDate = date.toLocaleString("fr-FR");
    const sender = msg.from?.user?.displayName || "Système";

    // Nettoyer le contenu HTML
    let content = msg.body.content;
    if (msg.body.contentType === "html") {
      content = content
        .replace(/<[^>]*>/g, "")
        .replace(/&nbsp;/g, " ")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&amp;/g, "&")
        .trim();
    }

    if (content) {
      console.log(`\n[${formattedDate}] ${sender}:`);
      console.log(`  ${content}`);
    }
  }

  console.log("\n" + "=".repeat(60));
}

// Exporter les messages en JSON
async function exportToJson(
  messages: TeamsMessage[],
  filename: string
): Promise<void> {
  const fs = await import("fs/promises");
  const data = JSON.stringify(messages, null, 2);
  await fs.writeFile(filename, data);
  console.log(`\n✅ Messages exportés vers ${filename}`);
}

// Fonction principale
async function main(): Promise<void> {
  console.log("🚀 Script de récupération des messages Teams\n");

  // Vérifier la configuration
  if (!config.tenantId || !config.clientId) {
    console.error("❌ Configuration manquante!");
    console.log("\nVariables d'environnement requises:");
    console.log("  AZURE_TENANT_ID  - ID du tenant Azure AD");
    console.log("  AZURE_CLIENT_ID  - ID de l'application Azure AD");
    console.log(
      "  AZURE_CLIENT_SECRET - (Optionnel) Secret pour auth application"
    );
    console.log("\nExemple:");
    console.log(
      '  export AZURE_TENANT_ID="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"'
    );
    console.log(
      '  export AZURE_CLIENT_ID="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"'
    );
    process.exit(1);
  }

  try {
    // Créer le client avec authentification interactive
    const client = await createGraphClientInteractive();

    // Lister les conversations disponibles
    await listChats(client);

    // Récupérer l'ID du chat depuis les arguments ou demander
    const chatId = process.argv[2];

    if (!chatId) {
      console.log("\n💡 Usage: npx ts-node get-teams-messages.ts <chat-id>");
      console.log("   Copiez l'ID d'une conversation ci-dessus.");
      return;
    }

    // Récupérer les messages
    const messages = await getChatMessages(client, chatId, 50);

    // Afficher les messages
    displayMessages(messages);

    // Exporter en JSON si demandé
    if (process.argv[3] === "--export") {
      const filename = `teams-messages-${Date.now()}.json`;
      await exportToJson(messages, filename);
    }
  } catch (error: any) {
    console.error("\n❌ Erreur:", error.message);
    if (error.statusCode === 401) {
      console.log("   → Vérifiez vos identifiants Azure AD");
    } else if (error.statusCode === 403) {
      console.log("   → Permissions insuffisantes sur l'application Azure AD");
    }
  }
}

main();
