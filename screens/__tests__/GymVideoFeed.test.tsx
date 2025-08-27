import { fireEvent, render, waitFor } from '@testing-library/react-native';
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
  it('navigates back to Chat tab when back button pressed', async () => {
    const navigate = jest.fn();
    const { getByLabelText } = render(<GymVideoFeed navigation={{ navigate }} />);
    const backButton = await waitFor(() => getByLabelText('Back to Chat'));
    fireEvent.press(backButton);
    expect(navigate).toHaveBeenCalledWith({ name: 'MainApp', params: { tabIndex: 0 }, merge: true });
  });
});