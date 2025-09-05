import { render } from '@testing-library/react-native';
import React from 'react';
import RewardsScreen from '../RewardsScreen';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  }),
}));

jest.mock('../../firebase/AppContext', () => ({
  useAppContext: () => ({ points: 100 }),
}));

jest.mock('../../hooks/useRewardHistory', () => ({
  useRewardHistory: () => [],
}));

jest.mock('react-native-confetti-cannon', () => () => null);
jest.mock('../../firebase/rewardsHelpers', () => ({ redeemReward: jest.fn() }));

describe('RewardsScreen', () => {
  it('does not display the coming soon overlay', () => {
    const { queryByText } = render(<RewardsScreen />);
    expect(queryByText('Coming Soon!')).toBeNull();
  });
});

