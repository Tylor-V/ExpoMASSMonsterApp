import { fetchSharedSplits, saveSharedSplits, updateProfileField, updateSocialLink } from '../userProfileHelpers';

jest.mock('../firebase', () => require('../../__mocks__/firebase'));

const { __getDoc, __reset } = require('../../__mocks__/firebase');

describe('userProfileHelpers save/fetch', () => {
  beforeEach(() => {
    __reset();
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
    await saveSharedSplits([{ id: 'old', name: 'Old' }]);
    await saveSharedSplits([{ id: 'new', name: 'New' }]);
    const splits = await fetchSharedSplits();
    expect(splits).toEqual([{ id: 'new', name: 'New' }]);
  });
});