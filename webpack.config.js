const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const Dotenv = require("dotenv-webpack");
const FilterWarningsPlugin = require("webpack-filter-warnings-plugin");

module.exports = {
  mode: 'development',
  entry: './public/js/main.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js',
    publicPath: '/'
  },
  devServer: {
    static: {
      directory: path.join(__dirname, 'public'),
    },
    compress: true,
    port: 3001,
    hot: true,
    historyApiFallback: true,
    proxy: {
      '/socket.io': {
        target: 'http://localhost:3001',
        ws: true
      }
    }
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        }
      },
      {
        test: /\.(png|svg|jpg|jpeg|gif)$/i,
        type: 'asset/resource',
      },
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/i,
        type: 'asset/resource',
      }
    ]
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './public/index.html',
      filename: 'index.html'
    }),
    new CopyWebpackPlugin({
      patterns: [
        { 
          from: 'public/img',
          to: 'img'
        },
        {
          from: 'public/css',
          to: 'css'
        },
        {
          from: 'public/sounds',
          to: 'sounds'
        },
        {
          from: 'public/sprites',
          to: 'sprites'
        }
      ]
    }),
    new Dotenv(),
    new FilterWarningsPlugin({
      exclude: [
        /mongodb/,
        /mssql/,
        /mysql/,
        /mysql2/,
        /oracledb/,
        /pg/,
        /pg-native/,
        /pg-query-stream/,
        /react-native-sqlite-storage/,
        /redis/,
        /sqlite3/,
        /sql.js/,
        /typeorm-aurora-data-api-driver/,
        /Critical dependency/,
      ],
    }),
  ],
  resolve: {
    extensions: ['.js'],
    alias: {
      '@': path.resolve(__dirname, 'public/js')
    }
  }
};
