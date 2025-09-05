import { act, fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import { View } from 'react-native';
import { colors } from '../../theme';
import ChatBar from '../ChatBar';

jest.mock('../../hooks/useChannelUnread', () => ({
  __esModule: true,
  default: jest.fn(() => ({})),
}));
jest.mock('../../hooks/useAnyDMUnread', () => ({
  __esModule: true,
  default: jest.fn(() => false),
}));

const mockUseChannelUnread = require('../../hooks/useChannelUnread').default as jest.Mock;
const mockUseAnyDMUnread = require('../../hooks/useAnyDMUnread').default as jest.Mock;

let mockPinnedMessages: any[] = [];
jest.mock('../../MainScreens/ChatScreen', () => {
  const React = require('react');
  return (props: any) => {
    React.useEffect(() => {
      props.onPinnedMessagesChange?.(mockPinnedMessages);
    }, [props.onPinnedMessagesChange]);
    return null;
  };
});

describe('ChatBar gym feed button', () => {
  it('renders film icon and calls onOpenGymFeed when pressed', () => {
    mockPinnedMessages = [];
    const onOpenGymFeed = jest.fn();
    const { getByTestId } = render(
      <ChatBar onOpenDMInbox={() => {}} onOpenGymFeed={onOpenGymFeed} />,
    );
    const icon = getByTestId('gym-feed-button');
    expect(icon.props.name).toBe('film-outline');
    expect(icon.props.color).toBe(colors.black);
    fireEvent.press(icon);
    expect(onOpenGymFeed).toHaveBeenCalled();
  });
});

jest.mock('../../firebase/firebase', () => ({
  firestore: () => ({
    collection: () => ({
      get: () => Promise.resolve({ docs: [] }),
      doc: () => ({
        collection: () => ({
          orderBy: () => ({
            limit: () => ({ get: () => Promise.resolve({ empty: true, docs: [] }) }),
          }),
        }),
      }),
    }),
  }),
  auth: () => ({ currentUser: { uid: 'user1' } }),
  storage: () => ({ ref: () => ({}) }),
}));

describe('ChatBar pinned button', () => {
  it('renders gray thumbtack and no badge when no pinned messages', () => {
    mockPinnedMessages = [];
    const { getByTestId, queryByTestId } = render(
      <ChatBar onOpenDMInbox={() => {}} onOpenGymFeed={() => {}} />,
    );
    const icon = getByTestId('pinned-button');
    expect(icon.props.color).toBe(colors.gray);
    expect(icon.props.name).toBe('thumb-tack');
    expect(queryByTestId('pinned-count-badge')).toBeNull();
  });

  it('renders accent thumbtack and badge when pinned messages exist', () => {
    mockPinnedMessages = [{ id: '1' }, { id: '2' }];
    const { getByTestId } = render(
      <ChatBar onOpenDMInbox={() => {}} onOpenGymFeed={() => {}} />,
    );
    const icon = getByTestId('pinned-button');
    expect(icon.props.color).toBe(colors.accent);
    expect(icon.props.name).toBe('thumb-tack');
    const badgeText = getByTestId('pinned-count-text');
    expect(badgeText.props.children).toBe(2);
  });

  it('positions pinned dropdown below chat bar', () => {
    mockPinnedMessages = [];
    (View as any).prototype.measureInWindow = (cb: any) => cb(0, 20, 0, 40);
    const { getByTestId } = render(
      <ChatBar onOpenDMInbox={() => {}} onOpenGymFeed={() => {}} />,
    );
    act(() => {
      fireEvent.press(getByTestId('pinned-button'));
    });
    const overlay = getByTestId('pinned-overlay');
    const style = overlay.props.style;
    const top = Array.isArray(style) ? style[1].top : style.top;
    expect(top).toBe(60);
  });
});

describe('ChatBar unread indicators', () => {
  beforeEach(() => {
    mockUseChannelUnread.mockReturnValue({});
    mockUseAnyDMUnread.mockReturnValue(false);
  });

  it('shows channel unread dot when any channel has unread messages', () => {
    mockUseChannelUnread.mockReturnValue({ general: true });
    const { getByTestId, queryByTestId } = render(
      <ChatBar onOpenDMInbox={() => {}} onOpenGymFeed={() => {}} />,
    );
    expect(getByTestId('channel-unread-dot')).toBeTruthy();
    expect(queryByTestId('dm-unread-dot')).toBeNull();
  });

  it('shows DM unread dot when any DM thread has unread messages', () => {
    mockUseAnyDMUnread.mockReturnValue(true);
    const { getByTestId } = render(
      <ChatBar onOpenDMInbox={() => {}} onOpenGymFeed={() => {}} />,
    );
    expect(getByTestId('dm-unread-dot')).toBeTruthy();
  });
});