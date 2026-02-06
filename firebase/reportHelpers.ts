import { firestore } from './firebase';

export const MESSAGE_REPORT_REASONS = [
  'Harassment/Bullying',
  'Hate Speech',
  'Nudity/Sexual Content',
  'Violence/Threats',
  'Self-harm',
  'Spam/Scams',
  'Other',
] as const;

export type MessageReportReason = (typeof MESSAGE_REPORT_REASONS)[number];

type SubmitMessageReportParams = {
  channelId: string;
  messageId: string;
  messageText?: string;
  reportedBy: string;
  targetUserId: string;
  reason: MessageReportReason;
  details?: string;
};

export async function submitMessageReport({
  channelId,
  messageId,
  messageText = '',
  reportedBy,
  targetUserId,
  reason,
  details = '',
}: SubmitMessageReportParams) {
  await firestore().collection('reports').add({
    targetType: 'message',
    reportedBy,
    targetId: messageId,
    targetUserId,
    channelId,
    messageText: messageText.slice(0, 500),
    reason,
    details: details.trim(),
    status: 'open',
    createdAt: firestore.FieldValue.serverTimestamp(),
    source: 'AllChannels',
    action: 'report',
  });
}
