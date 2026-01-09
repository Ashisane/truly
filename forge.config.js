module.exports = {
    packagerConfig: {
        asar: true,
        name: 'Truly',
    },
    rebuildConfig: {},
    makers: [
        {
            name: '@electron-forge/maker-squirrel',
            config: { name: 'truly' },
        },
        {
            name: '@electron-forge/maker-zip',
            platforms: ['win32'],
        },
    ],
    plugins: [
        {
            name: '@electron-forge/plugin-auto-unpack-natives',
            config: {},
        },
        {
            name: '@electron-forge/plugin-webpack',
            config: {
                mainConfig: './webpack.main.config.js',
                renderer: {
                    config: './webpack.renderer.config.js',
                    entryPoints: [
                        {
                            html: './src/renderer/overlay/index.html',
                            js: './src/renderer/overlay/index.tsx',
                            name: 'overlay_window',
                            preload: {
                                js: './src/preload/preload.js',  // Plain JS file!
                            },
                        },
                    ],
                },
            },
        },
    ],
};
