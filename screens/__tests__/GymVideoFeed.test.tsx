import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';
const mockUseVideoPlayer = jest.fn(() => ({
  play: jest.fn(),
  pause: jest.fn(),
  addListener: jest.fn(() => ({ remove: jest.fn() })),
}));

jest.mock('expo-video', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    VideoView: () => React.createElement(Text, { testID: 'video-view' }, 'video'),
    useVideoPlayer: (...args: any[]) => mockUseVideoPlayer(...args),
  };
});

jest.mock('../../firebase/firebase', () => ({
  auth: () => ({ currentUser: { uid: 'user1' } }),
  firestore: () => ({
    collection: (name: string) => {
      if (name === 'videos') {
        return {
          doc: () => ({
            collection: () => ({
              orderBy: () => ({
                onSnapshot: (cb: any) => {
                  cb({
                    docs: [
                      {
                        id: 'video-1',
                        data: () => ({
                          userId: 'user1',
                          url: 'https://example.com/video.mp4',
                          reactions: [],
                          hiddenBy: [],
                          reportedBy: [],
                          timestamp: Date.now(),
                        }),
                      },
                    ],
                  });
                  return jest.fn();
                },
              }),
            }),
          }),
        };
      }

      if (name === 'users') {
        return {
          doc: () => ({
            onSnapshot: (cb: any) => {
              cb({ exists: true, data: () => ({ role: 'member' }) });
              return jest.fn();
            },
          }),
        };
      }

      return {
        doc: () => ({
          collection: () => ({
            orderBy: () => ({ onSnapshot: () => jest.fn() }),
          }),
        }),
      };
    },
  }),
  storage: () => ({ ref: () => ({}) }),
}));

jest.mock('../../hooks/useBlockedUserIds', () => ({
  useBlockedUserIds: () => ({ blockedSet: new Set<string>() }),
}));

jest.mock('../../hooks/useReportedUserIds', () => ({
  useReportedUserIds: () => ({ reportedUserSet: new Set<string>() }),
}));

import GymVideoFeed from '../GymVideoFeed';

describe('GymVideoFeed', () => {
  beforeEach(() => {
    mockUseVideoPlayer.mockClear();
  });

  it('renders VideoView via expo-video player hook for feed items', async () => {
    const { getByTestId } = render(
      <GymVideoFeed navigation={{ goBack: jest.fn(), canGoBack: () => true, navigate: jest.fn() }} />,
    );

    expect(getByTestId('video-view')).toBeTruthy();
    expect(mockUseVideoPlayer).toHaveBeenCalledWith(
      { uri: 'https://example.com/video.mp4' },
      expect.any(Function),
    );
  });

  it('goes back when the back button is pressed', async () => {
    const goBack = jest.fn();
    const { getByLabelText } = render(
      <GymVideoFeed navigation={{ goBack, canGoBack: () => true, navigate: jest.fn() }} />,
    );
    const backButton = getByLabelText('Back to Chat');
    fireEvent.press(backButton);
    expect(goBack).toHaveBeenCalled();
  });
});