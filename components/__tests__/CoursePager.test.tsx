import { act, render } from '@testing-library/react-native';
import React, { createRef } from 'react';
import { BackHandler, ScrollView, Text } from 'react-native';
import CoursePager, { CoursePagerHandle } from '../CoursePager';

describe('CoursePager', () => {
  it('scrolls only once on page change', () => {
    const ref = createRef<CoursePagerHandle>();
    const spy = jest.spyOn(ScrollView.prototype, 'scrollTo');
    render(<CoursePager ref={ref} pages={[<Text key="1">1</Text>, <Text key="2">2</Text>]} />);
    spy.mockClear();
    act(() => {
      ref.current?.goToPage(1);
    });
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith({x: expect.any(Number), animated: true});
  });

  it('handles hardware back press when onBack provided', () => {
    const onBack = jest.fn();
    const remove = jest.fn();
    const addSpy = jest.spyOn(BackHandler, 'addEventListener').mockReturnValue({ remove });
    const {unmount} = render(<CoursePager pages={[<Text key="1">1</Text>]} onBack={onBack} />);
    const handler = addSpy.mock.calls[0][1];
    act(() => {
      handler();
    });
    expect(onBack).toHaveBeenCalledTimes(1);
    unmount();
    expect(remove).toHaveBeenCalled();
  });
});