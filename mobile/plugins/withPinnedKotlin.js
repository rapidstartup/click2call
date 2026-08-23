const { withProjectBuildGradle } = require('@expo/config-plugins');

/**
 * Expo 52.0.33's Android template leaves the Kotlin Gradle plugin unversioned,
 * so it resolves to 1.9.24 and fails Compose compiler 1.5.15 (needs 1.9.25).
 */
module.exports = function withPinnedKotlin(config) {
  return withProjectBuildGradle(config, (mod) => {
    mod.modResults.contents = mod.modResults.contents.replace(
      /classpath\(['"]org\.jetbrains\.kotlin:kotlin-gradle-plugin['"]\)/,
      'classpath("org.jetbrains.kotlin:kotlin-gradle-plugin:$kotlinVersion")'
    );
    return mod;
  });
};
