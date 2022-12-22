const path = require('path');
const nodeExternals = require('webpack-node-externals');
const WebpackShellPlugin = require('webpack-shell-plugin');
const { NODE_ENV = 'production' } = process.env;

module.exports = {
  entry: './src/server.ts',
  mode: NODE_ENV,
  target: 'node',
  output: {
    path: path.resolve(__dirname, 'build'),
    filename: 'server.js',
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: ['ts-loader'],
      },
    ],
  },
  externals: [nodeExternals()],
  watch: NODE_ENV === 'development',
  plugins: [
    new WebpackShellPlugin({
      onBuildEnd: ['npm start'],
    }),
  ],
};
