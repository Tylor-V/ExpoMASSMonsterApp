import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';

jest.mock('expo-video', () => ({ Video: () => null }));

jest.mock('../../firebase/firebase', () => ({
  auth: () => ({ currentUser: { uid: 'user1' } }),
  firestore: () => ({
    collection: () => ({
      doc: () => ({
        collection: () => ({
          orderBy: () => ({
            onSnapshot: (cb: any) => {
              cb({ docs: [] });
              return jest.fn();
            },
          }),
        }),
        onSnapshot: jest.fn(),
      }),
    }),
  }),
  storage: () => ({ ref: () => ({}) }),
}));

import GymVideoFeed from '../GymVideoFeed';

describe('GymVideoFeed', () => {
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