// Webpack rules - exclude problematic loaders from preload
module.exports = [
    {
        test: /native_modules[/\\].+\.node$/,
        use: 'node-loader',
    },
    {
        test: /\.tsx?$/,
        exclude: /(node_modules|\.webpack)/,
        use: {
            loader: 'ts-loader',
            options: {
                transpileOnly: true,
            },
        },
    },
    {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
    },
];
