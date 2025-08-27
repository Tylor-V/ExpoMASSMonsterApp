import { render } from '@testing-library/react-native';
import React from 'react';
import { colors } from '../../theme';
import ChatBar from '../ChatBar';

jest.mock('../../hooks/useChannelUnread', () => () => ({}));
jest.mock('../../hooks/useAnyDMUnread', () => () => false);

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
  it('renders black thumbtack when no pinned messages', () => {
    mockPinnedMessages = [];
    const { getByTestId } = render(
      <ChatBar onOpenDMInbox={() => {}} onOpenGymFeed={() => {}} />,
    );
    const icon = getByTestId('pinned-button');
    expect(icon.props.color).toBe(colors.black);
  });

  it('renders accent thumbtack when pinned messages exist', () => {
    mockPinnedMessages = [{ id: '1' }];
    const { getByTestId } = render(
      <ChatBar onOpenDMInbox={() => {}} onOpenGymFeed={() => {}} />,
    );
    const icon = getByTestId('pinned-button');
    expect(icon.props.color).toBe(colors.accent);
  });
});