module.exports = function override(config) {
  config.resolve.fallback = {
    fs: false,
    path: false,
    os: false,
    crypto: require.resolve("crypto-browserify"),
    stream: require.resolve("stream-browserify"),
    buffer: require.resolve("buffer"),
    util: require.resolve("util"),
    assert: require.resolve("assert"),
  };
  return config;
};