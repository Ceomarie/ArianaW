// Metro config for consuming the workspace `@racenotes/shared` package (TS
// source) from outside this app's own node_modules.
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const repoRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// Let Metro see the shared package and the repo-root node_modules.
config.watchFolders = [repoRoot, path.resolve(repoRoot, "packages/shared")];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(repoRoot, "node_modules"),
];
config.resolver.disableHierarchicalLookup = false;

module.exports = config;
