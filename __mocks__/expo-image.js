module.exports = {
  Image: jest.fn().mockImplementation(({children, ...props}) => {
    return require('react').createElement('Image', props, children);
  }),
  ImageBackground: jest.fn().mockImplementation(({children, ...props}) => {
    return require('react').createElement('ImageBackground', props, children);
  }),
  // default export
  default: jest.fn().mockImplementation(({children, ...props}) => {
    return require('react').createElement('Image', props, children);
  }),
};