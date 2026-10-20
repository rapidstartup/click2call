// Expo 52's Gradle `export:embed` bundle does not honour tsconfig paths
// unless Metro is created from expo/metro-config. Without this file the
// `@/` alias used across /mobile fails native Android release bundling.
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const config = getDefaultConfig(projectRoot);

const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const resolvedName = moduleName.startsWith('@/')
    ? path.resolve(projectRoot, moduleName.slice(2))
    : moduleName;

  if (defaultResolveRequest) {
    return defaultResolveRequest(context, resolvedName, platform);
  }
  return context.resolveRequest(context, resolvedName, platform);
};

module.exports = config;
