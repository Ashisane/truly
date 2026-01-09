module.exports = {
  entry: './src/main/index.ts',

  target: 'electron-main',

  module: {
    rules: require('./webpack.rules'),
  },

  resolve: {
    extensions: ['.js', '.ts', '.jsx', '.tsx', '.css', '.json'],
  },

  externals: {
    koffi: 'commonjs2 koffi'
  }
};
