const rules = require('./webpack.rules');

module.exports = {
    module: {
        rules,
    },
    resolve: {
        extensions: ['.js', '.ts', '.jsx', '.tsx', '.json'],
    },
    // Critical: Enable __dirname and __filename for preload scripts
    node: {
        __dirname: false,
        __filename: false,
    },
};
