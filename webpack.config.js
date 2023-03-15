//@ts-check

'use strict';

const path = require('path');
const webpack = require('webpack');
const NodePolyfillPlugin = require("node-polyfill-webpack-plugin");

/**@type {import('webpack').Configuration}*/
const config = {
    // experiments: {
    //     outputModule: true
    // },
    target: 'web',
    entry: './src',
    output: {
        path: path.resolve(__dirname, 'dist/browser'),
        libraryTarget: 'commonjs2',
        devtoolModuleFilenameTemplate: '../[resource-path]'
    },
    devtool: 'source-map',
    resolve: {
        mainFields: ['browser', 'module', 'main'], // look for `browser` entry point in imported node modules
        extensions: ['.ts', '.js'],
        alias: {
            // provides alternate implementation for node module and source files
        },
        fallback: {
            // Webpack 5 no longer polyfills Node.js core modules automatically.
            // see https://webpack.js.org/configuration/resolve/#resolvefallback
            // for the list of Node.js core module polyfills.
            fs: require.resolve('browserify-fs'),
            buffer: require.resolve('buffer'),
            path: require.resolve('path-browserify'),
            zlib: require.resolve('browserify-zlib'),
            process: require.resolve('process/browser'),
            stream: require.resolve('stream-browserify'),
            assert: require.resolve('assert'),
            console: require.resolve('console-browserify'),
            constants: require.resolve('constants-browserify'),
            crypto: require.resolve('crypto-browserify'),
            domain: require.resolve('domain-browser'),
            events: require.resolve('events'),
            http: require.resolve('stream-http'),
            https: require.resolve('https-browserify'),
            os: require.resolve('os-browserify/browser'),
            punycode: require.resolve('punycode'),
            querystring: require.resolve('querystring-es3'),
            string_decoder: require.resolve('string_decoder'),
            sys: require.resolve('util'),
            timers: require.resolve('timers-browserify'),
            tty: require.resolve('tty-browserify'),
            url: require.resolve('url'),
            // util: require.resolve('util'),
            vm: require.resolve('vm-browserify')
        }
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                exclude: /node_modules/,
                use: [
                    {
                        loader: 'ts-loader',
                    }
                ]
            }
        ]
    },
    plugins: [ new NodePolyfillPlugin() ],
    // optimization: {
    //     splitChunks: {
    //         chunks: 'all',
    //     },
    // },
};
module.exports = config;