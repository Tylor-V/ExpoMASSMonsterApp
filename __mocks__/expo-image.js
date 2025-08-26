module.exports = {
  Image: jest.fn().mockImplementation(({children, ...props}) => {
    return require('react').createElement('Image', props, children);
  }),
  // default export
  default: jest.fn().mockImplementation(({children, ...props}) => {
    return require('react').createElement('Image', props, children);
  }),
};