import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import SwipeableTabs from '../SwipeableTabs';

const scenes = {
  chat: () => null,
  classroom: () => null,
  profile: () => null,
  store: () => null,
  calendar: () => null,
};

describe('SwipeableTabs', () => {
  it('calls onTabChange when scrolling to a new tab', () => {
    const routes = [
      { key: 'chat', title: 'Chat', icon: 'chatbubble-ellipses-outline' },
      { key: 'calendar', title: 'Calendar', icon: 'calendar-outline' },
    ];
    const onTabChange = jest.fn();
    jest
      .spyOn(require('react-native'), 'useWindowDimensions')
      .mockReturnValue({ width: 300, height: 800 });
    const { getByTestId } = render(
      <SwipeableTabs routes={routes} scenes={scenes} onTabChange={onTabChange} />,
    );
    fireEvent.scroll(getByTestId('swipeable-tabs-list'), {
      nativeEvent: {
        contentOffset: { x: 300, y: 0 },
        layoutMeasurement: { width: 300, height: 800 },
        contentSize: { width: 600, height: 800 },
      },
    });
    expect(onTabChange).toHaveBeenCalledWith(1);
  });

  it('only renders label for the active tab', () => {
    const routes = [
      { key: 'chat', title: 'Chat', icon: 'chatbubble-ellipses-outline' },
      { key: 'calendar', title: 'Calendar', icon: 'calendar-outline' },
    ];
    const { queryByTestId } = render(
      <SwipeableTabs routes={routes} scenes={scenes} tabIndex={0} />,
    );
    expect(queryByTestId('tab-label-chat')).not.toBeNull();
    expect(queryByTestId('tab-label-calendar')).toBeNull();
  });
});