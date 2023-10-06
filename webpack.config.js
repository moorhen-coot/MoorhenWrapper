const webpack = require('webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

const path = require('path');

const paths = {
  src: path.resolve(__dirname, 'src'),
  dist: path.resolve(__dirname, 'dist'),
  publicBabyGru: path.resolve(__dirname, 'node_modules', 'moorhen', 'baby-gru')
}

module.exports = (env, argv) => {
  return {
    plugins:[
      new webpack.DefinePlugin({
        process: {env: {}}
      }), 
      new MiniCssExtractPlugin({
        filename: 'moorhen.css',
        chunkFilename: '[id].css',
        ignoreOrder: false,
      }),
      new CopyWebpackPlugin({
        patterns: [
          {
            from: paths.publicBabyGru,
            to: paths.dist + '/baby-gru/',
            toType: 'dir',
          }
        ],
      }),
    ],
    entry: path.join(__dirname, 'webcoot.js'),
    target: 'web',
    optimization: {
      minimize: argv.mode === 'development' ? false : true
    },
    cache: false,
    output: {
      clean: true,
      filename: 'moorhen.js',
      path: paths.dist,
      publicPath: './',
      library: 'moorhen',
      libraryTarget: 'umd',
      umdNamedDefine: true,
      globalObject: 'this'
    },
    module: {
      rules:[
        {
          test: /\.tsx$/,
          use: 'ts-loader',
          exclude: /node_modules/,
        },
        {
          test: /\.ts$/,
          use: 'ts-loader',
          exclude: /node_modules/,
        },
        {
          test: /\.js$/,
          exclude: [/node_modules/, path.resolve(paths.src, 'index.js'), paths.publicBabyGru],
          loader: 'babel-loader',
        },
        {
          test: /\.(?:ico|gif|png|jpg|jpeg|svg|xpm)$/,
          loader: 'file-loader',
          type: 'asset/resource',
        },
        {
          test: /\.css$/,
          sideEffects: true,
          use: [ MiniCssExtractPlugin.loader, 'css-loader'],
        }
      ]
    },
    resolve: {
      fallback: {
        fs: false
      },
      extensions: ['.ts', '.tsx', '.js'],
    }
  }
}
