const functions = require('firebase-functions');
const admin = require('firebase-admin');
if (!admin.apps.length) {
  admin.initializeApp();
}

const EXPO_PUSH_ENDPOINT = 'https://exp.host/--/api/v2/push/send';
const EXPO_RECEIPTS_ENDPOINT = 'https://exp.host/--/api/v2/push/getReceipts';
const EXPO_BATCH_SIZE = 100;
const MAX_TOKENS_PER_RUN = 500;

const getTextField = (news, keys, fallback = '') => {
  for (const key of keys) {
    if (typeof news[key] === 'string' && news[key].trim()) {
      return news[key].trim();
    }
  }
  return fallback;
};

const chunkArray = (arr, size) => {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
};

const isExpoToken = (token) => (
  typeof token === 'string' &&
  (token.startsWith('ExponentPushToken[') || token.startsWith('ExpoPushToken['))
);

exports.sendNewsPushNotification = functions.firestore
  .document('news/{newsId}')
  .onCreate(async (snap, context) => {
    const news = snap.data();
    if (!news) {
      return null;
    }

    const title = getTextField(news, ['title', 'headline'], 'MASS Monster News');
    const body = getTextField(news, ['message', 'body', 'description'], 'Tap to read the latest update.');

    const devicesSnapshot = await admin.firestore().collectionGroup('devices').get();

    const tokenToRefs = new Map();
    for (const doc of devicesSnapshot.docs) {
      const device = doc.data() || {};
      const token = device.expoPushToken;
      const newsPref = device.notificationPrefs && device.notificationPrefs.news;

      if (!isExpoToken(token) || newsPref === false) {
        continue;
      }

      if (!tokenToRefs.has(token)) {
        tokenToRefs.set(token, []);
      }
      tokenToRefs.get(token).push(doc.ref);
    }

    let tokens = Array.from(tokenToRefs.keys());
    if (tokens.length === 0) {
      functions.logger.info('No eligible Expo push tokens found for news notification.', {
        newsId: context.params.newsId,
      });
      return null;
    }

    if (tokens.length > MAX_TOKENS_PER_RUN) {
      functions.logger.info('Truncating news notification token list for this run.', {
        newsId: context.params.newsId,
        totalTokens: tokens.length,
        maxTokens: MAX_TOKENS_PER_RUN,
      });
      tokens = tokens.slice(0, MAX_TOKENS_PER_RUN);
    }

    const messages = tokens.map((token) => ({
      to: token,
      title,
      body,
      data: {
        type: 'news',
        newsId: context.params.newsId,
      },
    }));

    const messageChunks = chunkArray(messages, EXPO_BATCH_SIZE);
    const receiptIds = [];

    for (const chunk of messageChunks) {
      try {
        const response = await fetch(EXPO_PUSH_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(chunk),
        });

        const result = await response.json();
        functions.logger.info('Expo push send response received.', {
          newsId: context.params.newsId,
          status: response.status,
          errors: result.errors || [],
        });

        const tickets = Array.isArray(result.data) ? result.data : [];
        for (let i = 0; i < tickets.length; i++) {
          const ticket = tickets[i];
          if (ticket && ticket.id) {
            receiptIds.push(ticket.id);
          }

          if (ticket && ticket.status === 'error') {
            functions.logger.error('Expo ticket returned an error.', {
              newsId: context.params.newsId,
              details: ticket.details || null,
              message: ticket.message || null,
            });
          }
        }
      } catch (error) {
        functions.logger.error('Failed to send chunk to Expo push service.', {
          newsId: context.params.newsId,
          error: error.message,
        });
      }
    }

    const receiptChunks = chunkArray(receiptIds, EXPO_BATCH_SIZE);
    for (const chunk of receiptChunks) {
      try {
        const response = await fetch(EXPO_RECEIPTS_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ids: chunk}),
        });

        const result = await response.json();
        const receiptData = result.data || {};
        const invalidTokens = new Set();

        for (const [receiptId, receipt] of Object.entries(receiptData)) {
          if (receipt && receipt.status === 'error') {
            functions.logger.error('Expo receipt returned an error.', {
              newsId: context.params.newsId,
              receiptId,
              details: receipt.details || null,
              message: receipt.message || null,
            });

            if (receipt.details && receipt.details.error === 'DeviceNotRegistered') {
              const ticketIndex = receiptIds.indexOf(receiptId);
              const messageForTicket = ticketIndex >= 0 ? messages[ticketIndex] : null;
              if (messageForTicket && messageForTicket.to) {
                invalidTokens.add(messageForTicket.to);
              }
            }
          }
        }

        if (invalidTokens.size > 0) {
          const updates = [];
          for (const invalidToken of invalidTokens) {
            const refs = tokenToRefs.get(invalidToken) || [];
            for (const ref of refs) {
              updates.push(ref.set({invalidPushToken: true}, {merge: true}));
            }
          }
          await Promise.all(updates);
        }
      } catch (error) {
        functions.logger.error('Failed to fetch Expo push receipts.', {
          newsId: context.params.newsId,
          error: error.message,
        });
      }
    }

    return null;
  });
