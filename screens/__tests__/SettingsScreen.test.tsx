import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import SettingsScreen from '../SettingsScreen';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  }),
}));

describe('SettingsScreen', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it('navigates to Account when Account row pressed', () => {
    const { getByText } = render(<SettingsScreen />);
    fireEvent.press(getByText('Account'));
    jest.runAllTimers();
    expect(mockNavigate).toHaveBeenCalledWith('Account');
  });
});