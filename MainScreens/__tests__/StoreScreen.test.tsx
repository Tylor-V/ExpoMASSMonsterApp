import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Image } from 'expo-image';
import * as WebBrowser from 'expo-web-browser';
import React from 'react';
import { Linking } from 'react-native';
import StoreScreen from '../StoreScreen';

const baseProduct = {
  id: '1',
  title: 'Test Product',
  priceRange: { minVariantPrice: { amount: '10' } },
  images: ['https://example.com/image.jpg'],
  collections: [],
  variantId: 'gid://shopify/ProductVariant/1',
  variantTitle: 'Default',
  description: '',
};

let mockProducts = [baseProduct];
let mockCartItems: any[] = [];
let mockCollections: { id: string; title: string }[] = [];

jest.mock('../../hooks/useShopify', () => ({
  useShopifyCollections: () => ({ collections: mockCollections, loading: false, error: null }),
  useShopifyProducts: () => ({ products: mockProducts, loading: false, error: null }),
}));
jest.mock('../../hooks/useCart', () => ({
  useCart: () => ({ items: mockCartItems }),
}));

jest.mock('expo-web-browser', () => ({ openBrowserAsync: jest.fn() }));

jest.mock('../../firebase/cartHelpers', () => ({ addToCart: jest.fn() }));

jest.mock('../../components/AddToCartControl', () => () => null);
jest.mock('../../components/BackgroundWrapper', () => ({ children }: any) => children);
jest.mock('../../components/CartDrawer', () => () => null);
jest.mock('../../components/FeaturedCarousel', () => () => null);
jest.mock('../../components/ProductDescriptionTabs', () => () => null);
jest.mock('../../components/RollingNumber', () => () => null);

// Image from expo-image is mocked to React Native Image via jest config

beforeEach(() => {
  mockProducts = [baseProduct];
  mockCartItems = [];
  mockCollections = [];
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
    mockCollections = [{ id: 'featured', title: 'Featured' }];
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

describe('StoreScreen category ratings', () => {
  it('renders category icons on product cards', () => {
    mockProducts = [
      {
        ...baseProduct,
        id: '3',
        description:
          'Energy/Focus: 4 stars General Health: 3 stars Muscle Recovery: 5 stars',
      },
    ];
    const navigation = { navigate: jest.fn() } as any;
    const { UNSAFE_getAllByType, queryByText } = render(
      <StoreScreen navigation={navigation} />,
    );
    const icons = UNSAFE_getAllByType('Icon').filter((i: any) =>
      ['flash-outline', 'heart-outline', 'refresh-circle-outline'].includes(
        i.props.name,
      ),
    );
    expect(icons.length).toBe(3);
    expect(queryByText('Energy')).toBeNull();
  });

  it('shows rating rows inside the product drawer', async () => {
    mockProducts = [
      {
        ...baseProduct,
        id: '4',
        description:
          'Energy/Focus: 4 stars General Health: 3 stars Muscle Recovery: 5 stars',
      },
    ];
    const navigation = { navigate: jest.fn() } as any;
    const { getByTestId, getByText, UNSAFE_getAllByType } = render(
      <StoreScreen navigation={navigation} />,
    );
    fireEvent.press(getByTestId('product-card-4'));
    await waitFor(() => getByText('Energy'));
    const starIcons = UNSAFE_getAllByType('Icon').filter(
      (i: any) => i.props.name === 'star',
    );
    expect(starIcons.length).toBe(15);
  });
});
