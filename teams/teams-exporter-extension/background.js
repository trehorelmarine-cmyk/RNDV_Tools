// Background service worker pour les requetes Google Sheets

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'sendToGoogleSheets') {
    sendToGoogleSheets(request.url, request.messages)
      .then(result => sendResponse({ success: true, data: result }))
      .catch(error => sendResponse({ success: false, error: error.message, details: error.details }));

    // Retourner true pour indiquer qu'on repondra de maniere asynchrone
    return true;
  }
});

async function sendToGoogleSheets(scriptUrl, messages) {
  console.log('Background: Sending to Google Sheets', scriptUrl);
  console.log('Background: Messages count', messages.length);

  try {
    const response = await fetch(scriptUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify({ messages }),
      redirect: 'follow',
    });

    console.log('Background: Response status', response.status);
    console.log('Background: Response ok', response.ok);

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unable to read response');
      throw {
        message: `HTTP Error ${response.status}`,
        details: errorText
      };
    }

    const text = await response.text();
    console.log('Background: Response text', text);

    try {
      return JSON.parse(text);
    } catch {
      // Si ce n'est pas du JSON, on considere que c'est OK
      return { success: true, rowsAdded: messages.length };
    }

  } catch (error) {
    console.error('Background: Error', error);
    throw {
      message: error.message || 'Network error',
      details: error.details || error.toString()
    };
  }
}
