import React from 'react';
import AllChannels from './AllChannels';
import type { PropsWithChildren } from 'react';

type ChannelProps = PropsWithChildren<{
  channelId: string;
  channelName: string;
  isActive?: boolean;
  onHeightChange?: (height: number) => void;
  onPinnedMessagesChange?: (msgs: any[]) => void;
  onRegisterScrollToMessage?: (fn: (id: string) => void) => void;
}>;
const ModOnlyChannel: React.FC<ChannelProps> = props => (
  <AllChannels {...props} readOnly={false} />
);

export default ModOnlyChannel;