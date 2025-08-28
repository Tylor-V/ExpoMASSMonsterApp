import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { DeviceEventEmitter } from 'react-native';
import SplitEditorScreen from '../SplitEditorScreen';

jest.mock('../../components/SplitBuilder', () => {
  const React = require('react');
  const { TouchableOpacity, Text } = require('react-native');
  return ({ onSave }: any) => (
    <TouchableOpacity testID="save" onPress={() => onSave({} as any)}>
      <Text>Save</Text>
    </TouchableOpacity>
  );
});

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: jest.fn() }),
  useRoute: () => ({ params: { initialSplit: null } }),
}));

describe('SplitEditorScreen', () => {
  it('emits customSplitSaved event on save', () => {
    const emitSpy = jest.spyOn(DeviceEventEmitter, 'emit');
    const { getByTestId } = render(<SplitEditorScreen />);
    fireEvent.press(getByTestId('save'));
    expect(emitSpy).toHaveBeenCalledWith('customSplitSaved', expect.any(Object));
    emitSpy.mockRestore();
  });
});
