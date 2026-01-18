let isExtracting = false;
let exportType = 'csv';
let lastError = null;
let lastMessages = null;

// Modal functions
function showErrorModal(errorMsg, details, solutions) {
  const modal = document.getElementById('errorModal');
  document.getElementById('errorMessage').textContent = errorMsg;
  document.getElementById('errorDetails').textContent = details || 'Aucun detail disponible';

  const solutionsList = document.getElementById('errorSolutions');
  solutionsList.innerHTML = '';
  (solutions || []).forEach(sol => {
    const li = document.createElement('li');
    li.textContent = sol;
    solutionsList.appendChild(li);
  });

  modal.classList.add('visible');
}

function hideErrorModal() {
  document.getElementById('errorModal').classList.remove('visible');
}

// Modal event listeners
document.getElementById('closeModal')?.addEventListener('click', hideErrorModal);
document.getElementById('copyError')?.addEventListener('click', () => {
  const errorText = `Erreur: ${document.getElementById('errorMessage').textContent}\n\nDetails: ${document.getElementById('errorDetails').textContent}`;
  navigator.clipboard.writeText(errorText).then(() => {
    document.getElementById('copyError').textContent = 'Copie !';
    setTimeout(() => {
      document.getElementById('copyError').textContent = 'Copier l\'erreur';
    }, 2000);
  });
});
document.getElementById('retryBtn')?.addEventListener('click', () => {
  hideErrorModal();
  document.getElementById('startBtn').click();
});

// Load saved script URL
chrome.storage?.local?.get(['scriptUrl'], (result) => {
  if (result.scriptUrl) {
    document.getElementById('scriptUrl').value = result.scriptUrl;
  }
});

// Export type selection
document.querySelectorAll('.export-option').forEach(option => {
  option.addEventListener('click', () => {
    document.querySelectorAll('.export-option').forEach(o => o.classList.remove('selected'));
    option.classList.add('selected');
    exportType = option.dataset.type;

    const sheetsConfig = document.getElementById('sheetsConfig');
    if (exportType === 'sheets') {
      sheetsConfig.classList.add('visible');
    } else {
      sheetsConfig.classList.remove('visible');
    }
  });
});

// Help link
document.getElementById('helpLink').addEventListener('click', (e) => {
  e.preventDefault();
  chrome.tabs.create({
    url: chrome.runtime.getURL('help.html')
  });
});

// Main export button
document.getElementById('startBtn').addEventListener('click', async () => {
  const startBtn = document.getElementById('startBtn');
  const stopBtn = document.getElementById('stopBtn');
  const status = document.getElementById('status');
  const statusText = document.getElementById('statusText');
  const progressBar = document.getElementById('progressBar');

  // Get current tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab.url.includes('teams.microsoft.com')) {
    status.className = 'error';
    status.style.display = 'block';
    statusText.textContent = 'Veuillez ouvrir Microsoft Teams dans cet onglet.';
    return;
  }

  // Validate Google Sheets config
  const scriptUrl = document.getElementById('scriptUrl').value.trim();
  if (exportType === 'sheets' && !scriptUrl) {
    status.className = 'error';
    status.style.display = 'block';
    statusText.textContent = 'Veuillez entrer l\'URL du script Google Apps.';
    return;
  }

  // Save script URL for next time
  if (scriptUrl) {
    chrome.storage?.local?.set({ scriptUrl });
  }

  isExtracting = true;
  startBtn.disabled = true;
  stopBtn.style.display = 'block';
  status.className = 'loading';
  status.style.display = 'block';
  statusText.innerHTML = 'Chargement des messages... <span id="messageCount">0</span> messages';
  progressBar.style.width = '10%';

  // Masquer les stats précédentes
  document.getElementById('statsBox')?.classList.remove('visible');

  try {
    // Inject and execute content script
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: extractTeamsMessages,
    });

    if (results && results[0] && results[0].result) {
      const messages = results[0].result;

      if (messages.length === 0) {
        status.className = 'error';
        statusText.textContent = 'Aucun message trouve. Verifiez que vous etes dans une conversation.';
      } else {
        progressBar.style.width = '70%';

        if (exportType === 'csv') {
          statusText.textContent = `Export de ${messages.length} messages vers CSV...`;
          const csv = generateCSV(messages);
          const convName = tab.title.replace(/[^a-zA-Z0-9-_ ]/g, '').trim() || 'teams-conversation';
          downloadCSV(csv, `${convName}.csv`);

          progressBar.style.width = '100%';
          status.className = 'success';
          statusText.textContent = `${messages.length} messages exportes vers CSV !`;

        } else if (exportType === 'sheets') {
          statusText.textContent = `Envoi de ${messages.length} messages vers Google Sheets...`;
          progressBar.style.width = '80%';

          try {
            const response = await sendToGoogleSheets(scriptUrl, messages);

            progressBar.style.width = '100%';
            status.className = 'success';

            // Debug: afficher la réponse complète
            console.log('=== RÉPONSE GOOGLE SHEETS ===');
            console.log(JSON.stringify(response, null, 2));

            if (response.warning) {
              statusText.textContent = `${messages.length} messages envoyes ! Verifiez la feuille.`;
            } else {
              // Afficher le détail des opérations
              const added = response.rowsAdded || 0;
              const updated = response.rowsUpdated || 0;
              const skipped = response.rowsSkipped || 0;
              const ignored = response.rowsIgnored || 0;
              const total = added + updated + skipped + ignored;

              console.log(`Stats: added=${added}, updated=${updated}, skipped=${skipped}, ignored=${ignored}`);

              // Afficher la box de stats
              const statsBox = document.getElementById('statsBox');
              document.getElementById('statSupport').textContent = added;
              document.getElementById('statUpdated').textContent = updated;
              document.getElementById('statDuplicates').textContent = skipped;
              document.getElementById('statIgnored').textContent = ignored;
              document.getElementById('statTotal').textContent = total || messages.length;
              statsBox.classList.add('visible');

              statusText.textContent = `Traitement terminé !`;
            }
          } catch (sheetsError) {
            status.className = 'error';
            statusText.textContent = `Erreur - Cliquez pour les details`;
            status.style.cursor = 'pointer';
            status.onclick = () => {
              if (lastError) {
                showErrorModal(lastError.message, lastError.details, lastError.solutions);
              }
            };
          }
        }
      }
    }
  } catch (error) {
    console.error(error);
    status.className = 'error';
    statusText.textContent = `Erreur: ${error.message}`;
  } finally {
    isExtracting = false;
    startBtn.disabled = false;
    stopBtn.style.display = 'none';
  }
});

document.getElementById('stopBtn').addEventListener('click', () => {
  isExtracting = false;
  document.getElementById('startBtn').disabled = false;
  document.getElementById('stopBtn').style.display = 'none';
  document.getElementById('status').className = '';
  document.getElementById('status').style.display = 'none';
});

async function sendToGoogleSheets(scriptUrl, messages) {
  console.log('Sending to Google Sheets via background script:', scriptUrl);
  console.log('Messages count:', messages.length);

  lastMessages = messages;
  const errorDetails = {
    url: scriptUrl,
    messagesCount: messages.length,
    timestamp: new Date().toISOString(),
  };

  // Valider l'URL
  if (!scriptUrl.includes('script.google.com/macros')) {
    const error = {
      message: 'URL du script invalide',
      details: `L'URL doit commencer par https://script.google.com/macros/s/...\n\nURL fournie: ${scriptUrl}`,
      solutions: [
        'Verifiez que vous avez copie l\'URL complete du deploiement',
        'L\'URL doit ressembler a: https://script.google.com/macros/s/AKfycb.../exec',
        'Creez un nouveau deploiement si necessaire'
      ]
    };
    lastError = error;
    showErrorModal(error.message, error.details, error.solutions);
    throw new Error(error.message);
  }

  try {
    // Utiliser le background script pour eviter les problemes CORS
    const response = await chrome.runtime.sendMessage({
      action: 'sendToGoogleSheets',
      url: scriptUrl,
      messages: messages
    });

    console.log('Response from background:', response);

    if (response.success) {
      return response.data || { success: true, rowsAdded: messages.length };
    } else {
      throw {
        message: response.error || 'Erreur inconnue',
        details: response.details || JSON.stringify(errorDetails, null, 2),
        solutions: [
          'Verifiez les logs dans Apps Script (Executions)',
          'Assurez-vous que le script est deploye en "Tout le monde"',
          'Creez un NOUVEAU deploiement',
          'Essayez de lancer testWrite() dans Apps Script'
        ]
      };
    }

  } catch (error) {
    console.error('Send error:', error);

    // Si c'est deja une erreur formatee
    if (error.solutions) {
      lastError = error;
      showErrorModal(error.message, error.details, error.solutions);
      throw new Error(error.message);
    }

    // Erreur generique
    lastError = {
      message: error.message || 'Erreur de communication',
      details: JSON.stringify({ ...errorDetails, error: error.toString() }, null, 2),
      solutions: [
        'Rechargez l\'extension dans chrome://extensions',
        'Verifiez que l\'URL du script est correcte',
        'Essayez l\'export CSV en attendant'
      ]
    };
    showErrorModal(lastError.message, lastError.details, lastError.solutions);
    throw error;
  }
}


function generateCSV(messages) {
  const headers = ['Date', 'Heure', 'Auteur', 'Message'];
  const rows = messages.map(msg => [
    escapeCSV(msg.date || ''),
    escapeCSV(msg.time || ''),
    escapeCSV(msg.author || ''),
    escapeCSV(msg.content || '')
  ]);

  return [headers.join(';'), ...rows.map(row => row.join(';'))].join('\n');
}

function escapeCSV(str) {
  if (str === null || str === undefined) return '';
  str = String(str);
  str = str.replace(/\r?\n/g, ' ').replace(/"/g, '""');
  if (str.includes(';') || str.includes('"') || str.includes(',')) {
    return `"${str}"`;
  }
  return str;
}

function downloadCSV(csv, filename) {
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();

  URL.revokeObjectURL(url);
}

// This function will be injected into the Teams page
function extractTeamsMessages() {
  return new Promise(async (resolve) => {
    const messages = [];
    const seenMessages = new Set();

    const findMessageContainer = () => {
      const selectors = [
        '[class*="fui-Chat"]',
        '[data-tid="chat-pane-list"]',
        '[data-tid="message-pane-list"]',
        '.ts-message-list-container',
      ];

      for (const selector of selectors) {
        const el = document.querySelector(selector);
        if (el && el.scrollHeight > el.clientHeight) {
          return el;
        }
      }

      const allScrollable = document.querySelectorAll('*');
      for (const el of allScrollable) {
        if (el.scrollHeight > el.clientHeight + 100) {
          const hasMessages = el.querySelector('[class*="fui-ChatMessage"]') ||
                              el.querySelector('[data-tid="chat-pane-message"]');
          if (hasMessages) {
            return el;
          }
        }
      }

      return document.querySelector('[class*="fui-Chat"]') || document.body;
    };

    const container = findMessageContainer();
    console.log('Found container:', container?.className);

    const extractVisibleMessages = () => {
      const messageBlocks = document.querySelectorAll('[class*="fui-ChatMessage__body"], [data-tid="chat-pane-message"]');

      console.log(`Found ${messageBlocks.length} message blocks`);

      messageBlocks.forEach(msgEl => {
        try {
          let messageContainer = msgEl;
          while (messageContainer && !messageContainer.className?.includes('fui-ChatMessage ')) {
            messageContainer = messageContainer.parentElement;
            if (!messageContainer || messageContainer === document.body) {
              messageContainer = msgEl.closest('[class*="fui-unstable-ChatItem"]') || msgEl;
              break;
            }
          }

          let author = '';
          const authorEl = messageContainer.querySelector('[class*="fui-ChatMessage__author"]');
          if (authorEl) {
            author = authorEl.textContent.trim();
          }

          if (!author) {
            let prevSibling = messageContainer.previousElementSibling;
            let maxLookback = 10;
            while (prevSibling && !author && maxLookback > 0) {
              const prevAuthor = prevSibling.querySelector('[class*="fui-ChatMessage__author"]');
              if (prevAuthor) {
                author = prevAuthor.textContent.trim();
                break;
              }
              prevSibling = prevSibling.previousElementSibling;
              maxLookback--;
            }
          }

          let date = '';
          let time = '';
          const timeEl = messageContainer.querySelector('[class*="fui-ChatMessage__timestamp"]') ||
                        messageContainer.querySelector('[class*="timestamp"]') ||
                        messageContainer.querySelector('time');

          if (timeEl) {
            const datetime = timeEl.getAttribute('datetime');
            if (datetime) {
              const dt = new Date(datetime);
              date = dt.toLocaleDateString('fr-FR');
              time = dt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
            } else {
              const timeText = timeEl.textContent.trim();
              if (timeText.includes('/')) {
                const parts = timeText.split(' ');
                date = parts[0] || '';
                time = parts[1] || '';
              } else {
                time = timeText;
              }
            }
          }

          let content = '';
          const bodyEl = msgEl.className?.includes('fui-ChatMessage__body') ? msgEl :
                        messageContainer.querySelector('[class*="fui-ChatMessage__body"]');

          if (bodyEl) {
            content = bodyEl.innerText?.trim() || bodyEl.textContent?.trim() || '';
          } else {
            content = msgEl.innerText?.trim() || msgEl.textContent?.trim() || '';
          }

          if (author && content.startsWith(author)) {
            content = content.substring(author.length).trim();
          }

          const key = `${author}-${date}-${time}-${content.substring(0, 100)}`;

          if (content && content.length > 0 && !seenMessages.has(key)) {
            seenMessages.add(key);
            messages.push({ date, time, author, content });
            console.log(`Extracted: ${author} - ${time} - ${content.substring(0, 50)}...`);
          }
        } catch (e) {
          console.error('Error extracting message:', e);
        }
      });
    };

    // Date limite : 16/01/2026 - on arrête de scroller si on trouve des messages AVANT cette date
    const cutoffDate = new Date(2026, 0, 16, 0, 0, 0);

    const hasMessageBeforeCutoff = () => {
      for (const msg of messages) {
        if (msg.date && msg.date.includes('/')) {
          const [day, month, year] = msg.date.split('/');
          const msgDate = new Date(year, month - 1, day);
          // Arrêter seulement si on trouve des messages AVANT le 16 (pas le 16 lui-même)
          if (msgDate < cutoffDate) {
            return true;
          }
        }
      }
      return false;
    };

    const scrollToLoadAll = async () => {
      let lastScrollTop = container.scrollTop;
      let lastMessageCount = 0;
      let noChangeCount = 0;
      const maxIterations = 150;
      let iterations = 0;

      console.log('Starting scroll to load messages (will stop at 16/01/2026)...');

      while (iterations < maxIterations && noChangeCount < 5) {
        container.scrollTop = 0;
        await new Promise(r => setTimeout(r, 800));
        extractVisibleMessages();

        // Vérifier si on a atteint des messages avant la date limite
        if (hasMessageBeforeCutoff()) {
          console.log('Found messages before 16/01/2026, stopping scroll');
          break;
        }

        const currentCount = messages.length;

        if (container.scrollTop === lastScrollTop && currentCount === lastMessageCount) {
          noChangeCount++;
        } else {
          noChangeCount = 0;
        }

        lastScrollTop = container.scrollTop;
        lastMessageCount = currentCount;
        iterations++;

        console.log(`Iteration ${iterations}: ${messages.length} messages, scrollTop: ${container.scrollTop}`);
      }

      // Passe finale seulement si on n'a pas atteint la date limite
      if (!hasMessageBeforeCutoff()) {
        console.log('Final pass - scrolling through conversation...');
        const scrollHeight = container.scrollHeight;
        const step = container.clientHeight / 2;

        for (let pos = 0; pos <= scrollHeight; pos += step) {
          container.scrollTop = pos;
          await new Promise(r => setTimeout(r, 300));
          extractVisibleMessages();
        }
      }
    };

    extractVisibleMessages();
    await scrollToLoadAll();
    extractVisibleMessages();

    messages.sort((a, b) => {
      const parseDate = (d, t) => {
        if (!d && !t) return 0;
        if (d.includes('/')) {
          const [day, month, year] = d.split('/');
          const [hour, min] = (t || '00:00').split(':');
          return new Date(year, month - 1, day, hour, min).getTime();
        }
        return 0;
      };

      return parseDate(a.date, a.time) - parseDate(b.date, b.time);
    });

    // Filtrer : uniquement les messages à partir du 16 janvier 2026 (inclus)
    // cutoffDate déjà défini plus haut
    const filteredMessages = messages.filter(msg => {
      if (!msg.date) return false;
      if (msg.date.includes('/')) {
        const [day, month, year] = msg.date.split('/');
        const msgDate = new Date(year, month - 1, day);
        return msgDate >= cutoffDate;
      }
      return false;
    });

    console.log(`Total messages extracted: ${messages.length}`);
    console.log(`Messages from 16/01/2026 onwards: ${filteredMessages.length}`);
    resolve(filteredMessages);
  });
}
