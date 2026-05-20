const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Firebase v10 ships some modules as .cjs — Metro needs to know to resolve them
config.resolver.sourceExts = [...config.resolver.sourceExts, 'cjs'];

// Disable package exports field resolution (Firebase uses it in ways that confuse Metro)
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
