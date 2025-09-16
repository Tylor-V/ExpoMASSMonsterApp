import { firestore } from './firebase';

type SystemMessageInput = {
  channelId: string;
  title: string;
  body: string;
};

function sanitize(value: string) {
  return value.trim();
}

export async function postSystemMessage({
  channelId,
  title,
  body,
}: SystemMessageInput) {
  const targetChannel = sanitize(channelId || '');
  const safeTitle = sanitize(title || '');
  const safeBody = sanitize(body || '');

  if (!targetChannel || !safeTitle || !safeBody) {
    return;
  }

  try {
    await firestore()
      .collection('channels')
      .doc(targetChannel)
      .collection('messages')
      .add({
        type: 'system',
        title: safeTitle,
        body: safeBody,
        timestamp: firestore.FieldValue.serverTimestamp(),
        reactions: [],
        pinned: false,
      });
  } catch (error) {
    console.error('Failed to post system message', error);
  }
}
