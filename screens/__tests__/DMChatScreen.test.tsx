import { render, waitFor } from '@testing-library/react-native';
import React from 'react';

const mockMarkAsReadDM = jest.fn();

jest.mock('../../channels/AllChannels', () => ({
  chatStyles: {},
  JUMP_BUTTON_OFFSET: 80,
  useChatInputBarHeight: () => 56,
}));

jest.mock('../../components/WhiteBackgroundWrapper', () => {
  const React = require('react');
  const { View } = require('react-native');
  return ({ children }: any) => <View>{children}</View>;
});

jest.mock('../../components/ProfileImage', () => {
  const React = require('react');
  const { View } = require('react-native');
  return () => <View />;
});

jest.mock('../../components/UserPreviewModal', () => {
  const React = require('react');
  return () => null;
});

jest.mock('../../hooks/useKeyboardAnimation', () => ({
  useKeyboardAnimation: () => [0, 0],
}));

jest.mock('../../hooks/useBlockedUserIds', () => ({
  useBlockedUserIds: () => ({ blockedSet: new Set<string>() }),
}));

jest.mock('../../hooks/useReportedUserIds', () => ({
  useReportedUserIds: () => ({ reportedUserSet: new Set<string>() }),
}));

jest.mock('../../hooks/useHiddenContent', () => ({
  useHiddenContent: () => ({
    hiddenContentSet: new Set<string>(),
    hideContent: jest.fn(() => Promise.resolve()),
  }),
}));

jest.mock('../../firebase/userChatReadHelpers', () => ({
  useLastReadDM: () => [{ messageId: 'm1' }, mockMarkAsReadDM],
}));

jest.mock('../../firebase/reportHelpers', () => ({
  MESSAGE_REPORT_REASONS: ['Spam'],
  submitMessageReport: jest.fn(() => Promise.resolve()),
}));

jest.mock('../../firebase/firebase', () => ({
  auth: () => ({ currentUser: { uid: 'me' } }),
  firestore: () => ({
    collection: () => ({
      doc: () => ({
        collection: () => ({
          orderBy: () => ({
            limit: () => ({
              onSnapshot: (cb: any) => {
                cb({
                  docs: [
                    {
                      id: 'm2',
                      data: () => ({ userId: 'other', text: 'Latest message', timestamp: Date.now() }),
                    },
                    {
                      id: 'm1',
                      data: () => ({ userId: 'me', text: 'Older message', timestamp: Date.now() - 1000 }),
                    },
                  ],
                });
                return jest.fn();
              },
            }),
            startAfter: () => ({
              limit: () => ({
                get: () => Promise.resolve({ empty: true, docs: [] }),
              }),
            }),
          }),
        }),
      }),
    }),
    FieldValue: {
      serverTimestamp: jest.fn(() => Date.now()),
    },
  }),
}));

import DMChatScreen from '../DMChatScreen';

describe('DMChatScreen', () => {
  beforeEach(() => {
    mockMarkAsReadDM.mockClear();
  });

  it('renders messages without initialization errors and marks latest as read', async () => {
    const { getByText } = render(
      <DMChatScreen
        navigation={{ goBack: jest.fn() }}
        route={{
          params: {
            threadId: 'thread-1',
            otherUser: { uid: 'other', firstName: 'Other', lastName: 'User' },
          },
        }}
      />,
    );

    await waitFor(() => {
      expect(getByText('Latest message')).toBeTruthy();
      expect(getByText('Older message')).toBeTruthy();
    });

    await waitFor(() => {
      expect(mockMarkAsReadDM).toHaveBeenCalledWith('m2', expect.any(Number));
    });
  });
});