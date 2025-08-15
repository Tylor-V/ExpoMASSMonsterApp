const fsMocks: any = {};

jest.mock('@react-native-firebase/firestore', () => {
  const get = jest.fn();
  const set = jest.fn(() => Promise.resolve());
  const update = jest.fn(() => Promise.resolve());
  fsMocks.get = get;
  fsMocks.set = set;
  fsMocks.update = update;
  const collection = jest.fn();
  const doc = jest.fn(() => ({
    get,
    set,
    update,
    collection: jest.fn(() => collection()),
  }));
  collection.mockImplementation(() => ({ doc }));
  fsMocks.collection = collection;
  const firestoreFn: any = () => ({ collection });
  firestoreFn.FieldValue = {
    increment: jest.fn(() => 1),
    arrayUnion: jest.fn(),
  };
  return firestoreFn;
});

jest.mock('@react-native-firebase/auth', () => () => ({
  currentUser: { uid: 'test-user' },
}));

import firestore from '@react-native-firebase/firestore';
import { addAccountabilityPoint, updateSocialLink } from '../userProfileHelpers';

describe('addAccountabilityPoint', () => {
  const getMock = fsMocks.get as jest.Mock;
  const setMock = fsMocks.set as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    getMock.mockResolvedValue({ data: () => ({}) });
  });

  it('does not increment points when submitting more than once in a day', async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = yesterday.toLocaleDateString('en-CA');
    const todayKey = new Date().toLocaleDateString('en-CA');

    getMock.mockResolvedValueOnce({ data: () => ({ lastAccountabilityDate: yesterdayKey }) });
    await addAccountabilityPoint();
    expect(setMock).toHaveBeenCalledTimes(1);

    getMock.mockResolvedValueOnce({ data: () => ({ lastAccountabilityDate: todayKey }) });
    await addAccountabilityPoint();
    expect(setMock).toHaveBeenCalledTimes(1);
  });
});

describe('updateSocialLink', () => {
  const updateMock = fsMocks.update as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('updates only the given social platform', async () => {
    await updateSocialLink('insta', 'myhandle', false);
    expect(updateMock).toHaveBeenCalledWith({
      'socials.insta': {
        handle: 'https://www.instagram.com/myhandle',
        hidden: false,
      },
    });
  });
});