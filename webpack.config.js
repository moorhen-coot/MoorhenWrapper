const webpack = require("webpack");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const TerserPlugin = require("terser-webpack-plugin");

const path = require("path");

const paths = {
    src: path.resolve(__dirname, "src"),
    dist: path.resolve(__dirname, "dist"),
    publicAssets: path.resolve(__dirname, "node_modules", "moorhen", "public"),
};

module.exports = (env, argv) => {
    return {
        plugins: [
            new webpack.DefinePlugin({
                process: { env: {} },
            }),
            new MiniCssExtractPlugin({
                filename: "moorhen.css",
                chunkFilename: "[id].css",
                ignoreOrder: false,
            }),
            new CopyWebpackPlugin({
                patterns: [
                    {
                        from: paths.publicAssets,
                        to: paths.dist,
                        toType: "dir",
                    },
                ],
            }),
        ],
        entry: path.join(__dirname, "src", "ccp4cloud.ts"),
        target: "web",
        optimization: {
            minimize: argv.mode === "development" ? false : true,
            minimizer: [new TerserPlugin({ extractComments: false })],
        },
        cache: false,
        output: {
            clean: true,
            filename: "moorhen.js",
            path: paths.dist,
            publicPath: "./",
            library: "moorhen",
            libraryTarget: "umd",
            umdNamedDefine: true,
            globalObject: "this",
        },
        module: {
            rules: [
                {
                    test: /\.tsx$/,
                    use: {
                        loader: "ts-loader",
                        options: { transpileOnly: true },
                    },
                    exclude: /node_modules/,
                },
                {
                    test: /\.ts$/,
                    use: {
                        loader: "ts-loader",
                        options: { transpileOnly: true },
                    },
                    exclude: /node_modules/,
                },
                {
                    test: /\.(?:ico|gif|png|jpg|jpeg|svg|xpm)$/,
                    loader: "file-loader",
                    type: "asset/resource",
                },
                {
                    test: /\.css$/,
                    sideEffects: true,
                    use: [MiniCssExtractPlugin.loader, "css-loader"],
                },
            ],
        },
        resolve: {
            fallback: {
                fs: false,
            },
            extensions: [".ts", ".tsx", ".js"],
        },
    };
};
