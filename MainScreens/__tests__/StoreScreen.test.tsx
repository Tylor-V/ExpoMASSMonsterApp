import { render } from '@testing-library/react-native';
import React from 'react';
import StoreScreen from '../StoreScreen';

const product = {
  id: '1',
  title: 'Test Product',
  priceRange: { minVariantPrice: { amount: '10' } },
  images: [{ url: 'https://example.com/image.jpg' }],
  collections: [],
  variantId: 'gid://shopify/ProductVariant/1',
  variantTitle: 'Default',
};

jest.mock('../../hooks/useShopify', () => ({
  useShopifyCollections: () => ({ collections: [], loading: false, error: null }),
  useShopifyProducts: () => ({ products: [product], loading: false, error: null }),
}));

jest.mock('../../hooks/useCart', () => ({
  useCart: () => ({ items: [] }),
}));

jest.mock('../../firebase/cartHelpers', () => ({ addToCart: jest.fn() }));
jest.mock('../../utils/descriptionIcons', () => ({ getDescriptionIcons: () => [] }));

jest.mock('../../components/AddToCartControl', () => () => null);
jest.mock('../../components/BackgroundWrapper', () => ({ children }: any) => children);
jest.mock('../../components/CartDrawer', () => () => null);
jest.mock('../../components/FeaturedCarousel', () => () => null);
jest.mock('../../components/HtmlText', () => () => null);
jest.mock('../../components/RollingNumber', () => () => null);

// Image from expo-image is mocked to React Native Image via jest config

describe('StoreScreen product images', () => {
  it('renders placeholder while loading remote image', () => {
    const navigation = { navigate: jest.fn() } as any;
    const { UNSAFE_getAllByType } = render(<StoreScreen navigation={navigation} />);

    const images = UNSAFE_getAllByType('Image');
    const productImage = images.find(img => img.props.source?.uri === product.images[0].url);
    const placeholder = require('../../assets/mass-logo.png');

    expect(productImage).toBeTruthy();
    expect(productImage?.props.placeholder).toBe(placeholder);
  });
});