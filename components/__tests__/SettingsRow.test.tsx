import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import SettingsRow from '../SettingsRow';

describe('SettingsRow', () => {
  it('renders label and triggers onPress', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <SettingsRow icon="person-outline" label="Account" onPress={onPress} />
    );
    fireEvent.press(getByText('Account'));
    jest.runAllTimers();
    expect(onPress).toHaveBeenCalled();
  });
});