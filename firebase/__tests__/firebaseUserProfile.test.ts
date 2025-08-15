const fsMocks: any = {};

jest.mock('@react-native-firebase/firestore', () => {
  const get = jest.fn();
  const set = jest.fn(() => Promise.resolve());
  fsMocks.get = get;
  fsMocks.set = set;
  const doc = jest.fn(() => ({ get, set }));
  const collection = jest.fn(() => ({ doc }));
  fsMocks.collection = collection;
  const firestoreFn: any = () => ({ collection });
  firestoreFn.FieldValue = { serverTimestamp: jest.fn(() => 0) };
  return firestoreFn;
});

import firestore from '@react-native-firebase/firestore';
import { createOrUpdateUserProfile } from '../firebaseUserProfile';

describe('createOrUpdateUserProfile', () => {
  const getMock = fsMocks.get as jest.Mock;
  const setMock = fsMocks.set as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates default profile when none exists', async () => {
    getMock.mockResolvedValueOnce({ exists: false });
    await createOrUpdateUserProfile({
      uid: 'u1',
      email: 'test@example.com',
      firstName: 'Jane',
      lastName: 'Doe',
    });
    expect(setMock).toHaveBeenCalledWith(
      expect.objectContaining({
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'test@example.com',
      })
    );
  });

  it('adds missing names for existing user', async () => {
    getMock.mockResolvedValueOnce({ exists: true, data: () => ({}) });
    await createOrUpdateUserProfile({
      uid: 'u2',
      email: 'test2@example.com',
      firstName: 'John',
      lastName: 'Smith',
    });
    expect(setMock).toHaveBeenCalledWith(
      expect.objectContaining({
        firstName: 'John',
        lastName: 'Smith',
      }),
      { merge: true }
    );
  });
});