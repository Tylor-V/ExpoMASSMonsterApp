import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import { Text } from 'react-native';
import { useSettingsNavigation } from '../useSettingsNavigation';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  }),
}));

const TestComponent = () => {
  const { handleNavigate, goBack } = useSettingsNavigation();
  return (
    <>
      <Text testID="navigate" onPress={handleNavigate('Account')}>Nav</Text>
      <Text testID="back" onPress={goBack}>Back</Text>
    </>
  );
};

describe('useSettingsNavigation', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockGoBack.mockClear();
  });

  it('navigates to route when handleNavigate is called', () => {
    const { getByTestId } = render(<TestComponent />);
    fireEvent.press(getByTestId('navigate'));
    expect(mockNavigate).toHaveBeenCalledWith('Account');
  });

  it('goBack calls navigation.goBack', () => {
    const { getByTestId } = render(<TestComponent />);
    fireEvent.press(getByTestId('back'));
    expect(mockGoBack).toHaveBeenCalled();
  });
});