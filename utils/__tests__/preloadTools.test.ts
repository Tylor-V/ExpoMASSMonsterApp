import {preloadGlobals, badgeAssets} from '../preloadTools';
import {Image} from 'react-native';

describe('preloadGlobals', () => {
  it('preloads badge images', () => {
    preloadGlobals();
    expect(Image.prefetch).toHaveBeenCalled();
  });
});