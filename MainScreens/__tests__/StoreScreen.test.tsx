import { render, fireEvent, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Linking } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import StoreScreen from '../StoreScreen';
import { Image } from 'expo-image';

const baseProduct = {
  id: '1',
  title: 'Test Product',
  priceRange: { minVariantPrice: { amount: '10' } },
  images: ['https://example.com/image.jpg'],
  collections: [],
  variantId: 'gid://shopify/ProductVariant/1',
  variantTitle: 'Default',
};

let mockProducts = [baseProduct];
let mockCartItems: any[] = [];

jest.mock('../../hooks/useShopify', () => ({
  useShopifyCollections: () => ({ collections: [], loading: false, error: null }),
  useShopifyProducts: () => ({ products: mockProducts, loading: false, error: null }),
}));
jest.mock('../../hooks/useCart', () => ({
  useCart: () => ({ items: mockCartItems }),
}));

jest.mock('expo-web-browser', () => ({ openBrowserAsync: jest.fn() }));

jest.mock('../../firebase/cartHelpers', () => ({ addToCart: jest.fn() }));
jest.mock('../../utils/descriptionIcons', () => ({ getDescriptionIcons: () => [] }));

jest.mock('../../components/AddToCartControl', () => () => null);
jest.mock('../../components/BackgroundWrapper', () => ({ children }: any) => children);
jest.mock('../../components/CartDrawer', () => () => null);
jest.mock('../../components/FeaturedCarousel', () => () => null);
jest.mock('../../components/HtmlText', () => () => null);
jest.mock('../../components/RollingNumber', () => () => null);

// Image from expo-image is mocked to React Native Image via jest config

beforeEach(() => {
  mockProducts = [baseProduct];
  mockCartItems = [];
  (Image as any).prefetch = jest.fn();
  jest.clearAllMocks();
});

describe('StoreScreen product images', () => {
  it('shows loader while remote image loads', () => {
    const navigation = { navigate: jest.fn() } as any;
    const { UNSAFE_getAllByType } = render(<StoreScreen navigation={navigation} />);

    const images = UNSAFE_getAllByType('Image');
    const productImage = images.find(img => img.props.source?.uri === baseProduct.images[0]);

    expect(productImage).toBeTruthy();
    expect(productImage?.props.placeholder).toBeUndefined();

    const loaders = UNSAFE_getAllByType('ActivityIndicator');
    expect(loaders.length).toBeGreaterThan(0);
  });

  it('shows loader when no product image available', () => {
    mockProducts = [{ ...baseProduct, id: '2', images: [] }];
    const navigation = { navigate: jest.fn() } as any;
    const { UNSAFE_getAllByType } = render(<StoreScreen navigation={navigation} />);

    const images = UNSAFE_getAllByType('Image');
    const productImage = images.find(img => img.props.source?.uri);

    expect(productImage).toBeUndefined();

    const loaders = UNSAFE_getAllByType('ActivityIndicator');
    expect(loaders.length).toBeGreaterThan(0);
  });

  it('prefetches product images', async () => {
    const navigation = { navigate: jest.fn() } as any;
    render(<StoreScreen navigation={navigation} />);
    await waitFor(() => {
      expect((Image as any).prefetch).toHaveBeenCalledWith(baseProduct.images[0]);
    });
  });
});

describe('StoreScreen featured section', () => {
  it('renders Bestsellers label when featured products are available', () => {
    const navigation = { navigate: jest.fn() } as any;
    const { getByText } = render(<StoreScreen navigation={navigation} />);
    expect(getByText('Bestsellers')).toBeTruthy();
  });
});

describe('StoreScreen checkout', () => {
  it('uses web browser if Linking.openURL fails', async () => {
    mockCartItems = [
      {
        id: '1',
        title: 'Test',
        price: 10,
        image: '',
        quantity: 1,
        variantId: 'gid://shopify/ProductVariant/1',
      },
    ];
    const navigation = { navigate: jest.fn() } as any;
    jest.spyOn(Linking, 'canOpenURL').mockResolvedValue(true);
    jest.spyOn(Linking, 'openURL').mockRejectedValue(new Error('fail'));
    const openBrowser = WebBrowser.openBrowserAsync as jest.Mock;
    openBrowser.mockResolvedValue({ type: 'opened' } as any);

    const { getByText } = render(<StoreScreen navigation={navigation} />);
    fireEvent.press(getByText('Checkout'));

    await waitFor(() => {
      expect(openBrowser).toHaveBeenCalled();
    });
  });
});