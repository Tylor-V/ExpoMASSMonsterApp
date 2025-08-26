import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import { FlatList } from 'react-native';
import FeaturedCarousel from '../FeaturedCarousel';

jest.mock('../AddCartButton', () => () => null);

describe('FeaturedCarousel', () => {
  const products = [
    { id: '1', title: 'Product 1', priceRange: { minVariantPrice: { amount: '10' } }, images: [{ url: 'url1' }] },
    { id: '2', title: 'Product 2', priceRange: { minVariantPrice: { amount: '20' } }, images: [{ url: 'url2' }] },
  ];

  it('calls onSelect when an item is pressed', () => {
    const onSelect = jest.fn();
    const { getByText } = render(<FeaturedCarousel products={products} onSelect={onSelect} />);
    fireEvent.press(getByText('Product 1'));
    expect(onSelect).toHaveBeenCalledWith(products[0]);
  });

  it('navigates using arrow buttons', () => {
    const onSelect = jest.fn();
    const spy = jest.spyOn(FlatList.prototype as any, 'scrollToIndex').mockImplementation(() => {});
    const { getByTestId } = render(
      <FeaturedCarousel products={products} onSelect={onSelect} />,
    );
    spy.mockClear();
    fireEvent.press(getByTestId('next-arrow'));
    jest.runAllTimers();
    expect(spy).toHaveBeenLastCalledWith({ index: 1, animated: false });
    fireEvent.press(getByTestId('prev-arrow'));
    jest.runAllTimers();
    expect(spy).toHaveBeenLastCalledWith({ index: 0, animated: false });
  });
});