import { act, render } from '@testing-library/react-native';
import React from 'react';
import { Text } from 'react-native';
import useChannelUnread from '../useChannelUnread';

const authState: { currentUser: { uid: string } | null } = {
  currentUser: { uid: 'user1' },
};
type LastReadListener = (doc: { data: () => { timestamp?: number } }) => void;
type MessageListener = (snap: { docs: Array<{ data: () => any }> }) => void;

const lastReadListeners: Record<string, LastReadListener | undefined> = {};
const messageListeners: Record<string, MessageListener | undefined> = {};

jest.mock('../../firebase/firebase', () => ({
  __esModule: true,
  auth: () => authState,
  firestore: () => ({
    collection: (name: string) => {
      if (name === 'users') {
        return {
          doc: () => ({
            collection: () => ({
              doc: (cid: string) => ({
                onSnapshot: (cb: LastReadListener) => {
                  lastReadListeners[cid] = cb;
                  return () => {
                    if (lastReadListeners[cid] === cb) {
                      delete lastReadListeners[cid];
                    }
                  };
                },
              }),
            }),
          }),
        };
      }

      if (name === 'channels') {
        return {
          doc: (cid: string) => ({
            collection: () => ({
              orderBy: () => ({
                limit: () => ({
                  onSnapshot: (cb: MessageListener) => {
                    messageListeners[cid] = cb;
                    return () => {
                      if (messageListeners[cid] === cb) {
                        delete messageListeners[cid];
                      }
                    };
                  },
                }),
              }),
            }),
          }),
        };
      }

      return { doc: () => ({}) };
    },
  }),
}));

const createLastReadSnapshot = (timestamp: number) => ({
  data: () => ({ timestamp }),
});

const createMessageSnapshot = (timestamp: number, userId: string | null) => ({
  docs:
    Number.isFinite(timestamp)
      ? [
          {
            data: () => ({ timestamp, userId }),
          },
        ]
      : [],
});

describe('useChannelUnread', () => {
  beforeEach(() => {
    authState.currentUser = { uid: 'user1' };
    Object.keys(lastReadListeners).forEach(key => delete lastReadListeners[key]);
    Object.keys(messageListeners).forEach(key => delete messageListeners[key]);
  });

  const TestComponent = ({
    channelIds,
    activeId,
  }: {
    channelIds: string[];
    activeId: string;
  }) => {
    const unreadMap = useChannelUnread(channelIds, activeId);
    return <Text testID="unread-map">{JSON.stringify(unreadMap)}</Text>;
  };

  const getUnreadMap = (getText: () => any) => {
    const node = getText();
    const value = node.props.children;
    return typeof value === 'string' ? JSON.parse(value) : value;
  };

  it('clears unread state when signing out and keeps users isolated', async () => {
    const { getByTestId, rerender } = render(
      <TestComponent channelIds={['channel-1']} activeId="other" />,
    );

    const unreadValue = () => getUnreadMap(() => getByTestId('unread-map'));

    await act(async () => {
      lastReadListeners['channel-1']?.(createLastReadSnapshot(1));
    });
    await act(async () => {
      messageListeners['channel-1']?.(createMessageSnapshot(5, 'friend'));
    });

    expect(unreadValue()).toMatchObject({ 'channel-1': true });

    authState.currentUser = null;
    await act(async () => {
      rerender(<TestComponent channelIds={[]} activeId="other" />);
    });

    expect(unreadValue()).toEqual({});
    expect(lastReadListeners['channel-1']).toBeUndefined();
    expect(messageListeners['channel-1']).toBeUndefined();

    authState.currentUser = { uid: 'user2' };
    await act(async () => {
      rerender(<TestComponent channelIds={['channel-1']} activeId="other" />);
    });

    await act(async () => {
      lastReadListeners['channel-1']?.(createLastReadSnapshot(10));
    });
    await act(async () => {
      messageListeners['channel-1']?.(createMessageSnapshot(5, 'friend'));
    });

    expect(unreadValue()).toMatchObject({ 'channel-1': false });
  });
});
