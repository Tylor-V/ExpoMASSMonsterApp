import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Alert } from 'react-native';

const mockDispatch = jest.fn();
const mockSetAppStatus = jest.fn();
const mockRequestGet = jest.fn(() => Promise.resolve({ exists: false }));
const mockRequestSet = jest.fn(() => Promise.resolve());
const mockReauth = jest.fn(() => Promise.resolve());
const mockCredential = jest.fn(() => ({ providerId: 'password' }));
const mockSignOut = jest.fn(() => Promise.resolve());

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: jest.fn(),
    navigate: jest.fn(),
    dispatch: mockDispatch,
  }),
  CommonActions: {
    reset: (payload: any) => ({ type: 'RESET', payload }),
  },
}));

jest.mock('../../firebase/AppContext', () => ({
  useAppContext: () => ({
    setAppStatus: mockSetAppStatus,
  }),
}));

jest.mock('../../hooks/useCurrentUserDoc', () => ({
  useCurrentUserDoc: () => ({
    email: 'user@example.com',
    firstName: 'Test',
    lastName: 'User',
  }),
}));

jest.mock('../../firebase/firebase', () => {
  const firestoreFn: any = () => ({
    collection: (name: string) => {
      if (name === 'accountDeletionRequests') {
        return {
          doc: () => ({
            get: mockRequestGet,
            set: mockRequestSet,
          }),
        };
      }
      return {
        doc: () => ({
          set: jest.fn(() => Promise.resolve()),
        }),
      };
    },
  });

  firestoreFn.FieldValue = {
    serverTimestamp: jest.fn(() => Date.now()),
  };

  return {
    auth: () => ({
      currentUser: {
        uid: 'uid-1',
        email: 'user@example.com',
      },
    }),
    firestore: firestoreFn,
  };
});

jest.mock('firebase/auth', () => ({
  EmailAuthProvider: {
    credential: (...args: any[]) => mockCredential(...args),
  },
  reauthenticateWithCredential: (...args: any[]) => mockReauth(...args),
  signOut: (...args: any[]) => mockSignOut(...args),
  updateEmail: jest.fn(() => Promise.resolve()),
  updatePassword: jest.fn(() => Promise.resolve()),
  updateProfile: jest.fn(() => Promise.resolve()),
}));

jest.mock('../../utils/clearUserCache', () => ({
  clearUserCache: jest.fn(() => Promise.resolve()),
}));

import AccountScreen from '../AccountScreen';

describe('AccountScreen account deletion', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a deletion request after reauth and signs out after confirmation', async () => {
    const alertSpy = jest
      .spyOn(Alert, 'alert')
      .mockImplementation((_title: any, _message?: any, buttons?: any) => {
        if (Array.isArray(buttons) && buttons[0]?.onPress) {
          buttons[0].onPress();
        }
      });

    const { getByText, getByPlaceholderText } = render(<AccountScreen />);

    fireEvent.press(getByText('Delete Account'));
    act(() => {
      jest.advanceTimersByTime(120);
    });
    fireEvent.changeText(getByPlaceholderText('Current Password'), 'secret123');
    fireEvent.changeText(getByPlaceholderText('Type DELETE to confirm'), 'DELETE');
    fireEvent.press(getByText('Request deletion'));

    await waitFor(() => {
      expect(mockCredential).toHaveBeenCalledWith('user@example.com', 'secret123');
      expect(mockReauth).toHaveBeenCalled();
      expect(mockRequestSet).toHaveBeenCalledWith(
        expect.objectContaining({
          uid: 'uid-1',
          status: 'pending',
          requestSource: 'in-app',
        }),
      );
    });

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled();
      expect(mockSetAppStatus).toHaveBeenCalledWith({ user: null, points: 0, workoutHistory: [] });
      expect(mockDispatch).toHaveBeenCalled();
    });

    expect(alertSpy).toHaveBeenCalledWith(
      'Request submitted',
      expect.stringContaining('deletion request has been submitted'),
      expect.any(Array),
    );

    alertSpy.mockRestore();
  });
});