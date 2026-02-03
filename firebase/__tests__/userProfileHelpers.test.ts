import { fetchSharedSplits, saveSharedSplits, updateProfileField, updateSocialLink } from '../userProfileHelpers';

jest.mock('../firebase', () => require('../../__mocks__/firebase'));

const { __getDoc, __reset } = require('../../__mocks__/firebase');

describe('userProfileHelpers save/fetch', () => {
  beforeEach(() => {
    __reset();
  });

  const makeSplit = (name: string) => ({
    id: name.toLowerCase(),
    msgId: name.toLowerCase(),
    fromName: 'Tester',
    fromPic: '',
    savedAt: Date.now(),
    split: {
      name,
      startDate: '2024-01-01',
      days: [
        { title: 'Day 1', lifts: [], notes: '' },
        { title: 'Day 2', lifts: [], notes: '' },
        { title: 'Day 3', lifts: [], notes: '' },
      ],
    },
  });

  test('updateProfileField writes to user doc', async () => {
    await updateProfileField('bio', 'Hello world');
    const doc = __getDoc(['users', 'test-uid']);
    expect(doc.bio).toBe('Hello world');
  });

  test('updateSocialLink stores formatted url', async () => {
    await updateSocialLink('insta', '@tester', false);
    const doc = __getDoc(['users', 'test-uid']);
    expect(doc.socials.insta).toEqual({
      handle: 'https://www.instagram.com/tester',
      hidden: false,
    });
  });

  test('saveSharedSplits replaces existing and fetchSharedSplits returns saved data', async () => {
    await saveSharedSplits([makeSplit('Old')]);
    await saveSharedSplits([makeSplit('New')]);
    const splits = await fetchSharedSplits();
    expect(splits).toEqual([makeSplit('New')]);
  });
});
