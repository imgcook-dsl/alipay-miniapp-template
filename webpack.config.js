const path = require('path');

module.exports = {
  entry: './src/app.js',
  output: {
    filename: 'index.js',
    path: path.resolve(__dirname, 'src'),
    libraryTarget: 'commonjs2',
  }
};