const React = require('react')
function NextImage({ src, alt, ...props }) {
  return React.createElement('img', { src, alt, ...props })
}
module.exports = NextImage
module.exports.default = NextImage
