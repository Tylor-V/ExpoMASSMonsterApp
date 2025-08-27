import { render } from '@testing-library/react-native';
import React from 'react';
import { Text } from 'react-native';
import { useNews } from '../useNews';

jest.mock('../../firebase/firebase', () => ({
  firestore: () => ({
    collection: () => ({
      where: () => ({
        onSnapshot: (cb: any) => {
          cb({
            docs: [
              {
                id: '1',
                data: () => ({ message: 'Test news', created: { toMillis: () => 1 } }),
              },
            ],
          });
          return () => {};
        },
      }),
    }),
  }),
}));

describe('useNews', () => {
  it('loads news from firestore', () => {
    const Comp = () => {
      const { news, loading } = useNews();
      return <Text>{loading ? 'loading' : news[0]?.message}</Text>;
    };
    const { getByText } = render(<Comp />);
    getByText('Test news');
  });
});