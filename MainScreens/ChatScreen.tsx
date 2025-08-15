import React from 'react';
import type { PropsWithChildren } from 'react';
import GeneralChannel from '../channels/GeneralChannel';
import MemesChannel from '../channels/MemesChannel';
import SplitSharingChannel from '../channels/SplitSharingChannel';
import ModOnlyChannel from '../channels/ModOnlyChannel';
import CommunityVoiceChannel from '../channels/CommunityVoiceChannel';
export { useChatInputBarHeight } from '../channels/AllChannels';

type ChatScreenProps = PropsWithChildren<{
  channelId: string;
  channelName: string;
  isActive?: boolean;
  onHeightChange?: (height: number) => void;
  onPinnedMessagesChange?: (msgs: any[]) => void;
  onRegisterScrollToMessage?: (fn: (id: string) => void) => void;
}>;

const CHANNEL_COMPONENTS: Record<string, React.ComponentType<ChatScreenProps>> = {
  general: GeneralChannel,
  memes: MemesChannel,
  'split-sharing': SplitSharingChannel,
  'mod-only': ModOnlyChannel,
  'community-voice': CommunityVoiceChannel,
};

const ChatScreen: React.FC<ChatScreenProps> = props => {
  const ChannelComponent = CHANNEL_COMPONENTS[props.channelId] || GeneralChannel;
  return <ChannelComponent {...props} />;
};

export default React.memo(ChatScreen);