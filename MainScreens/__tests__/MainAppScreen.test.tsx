import { fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';
import MainAppScreen from '../MainAppScreen';

jest.mock('../../components/ChatBar', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return ({ isActive }: any) => (
    <Text>{isActive ? 'Chat Active' : 'Chat Inactive'}</Text>
  );
});
jest.mock('../ClassroomScreen', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return () => <Text>Classroom Screen</Text>;
});
jest.mock('../ProfileScreen', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return () => <Text>Profile Screen</Text>;
});
jest.mock('../StoreScreen', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return () => <Text>Store Screen</Text>;
});
jest.mock('../CalendarScreen', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return () => <Text>Calendar Screen</Text>;
});
jest.mock('../../components/NewsModal', () => () => null);
jest.mock('../../components/ProfileModal', () => () => null);
jest.mock('../../hooks/useCurrentUserDoc', () => ({ useCurrentUserDoc: () => null }));
jest.mock('../../hooks/usePresence', () => jest.fn());

describe('MainAppScreen', () => {
  it('switches to Chat tab when pressed', async () => {
    const navigation = { navigate: jest.fn() } as any;
    const { getByText } = render(
      <MainAppScreen navigation={navigation} news={[]} newsLoaded onNewsAdded={jest.fn()} />,
    );
    fireEvent.press(getByText('Chat'));
    await waitFor(() => getByText('Chat Active'));
  });
});