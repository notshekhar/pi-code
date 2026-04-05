/**
 * electron-builder beforeBuild: skip rebuilding electron-liquid-glass for non-mac targets.
 * That package is Darwin-only; @electron/rebuild falls through to node-gyp, which cannot
 * cross-compile (e.g. Windows target from macOS). Win/Linux asar already exclude it
 * (see electron-builder.config.js).
 *
 * node-gyp also cannot cross-compile for a different host OS or CPU arch. In those cases
 * we skip rebuild and pack dependencies as-is (prebuilds shipped in tarballs). Prefer
 * building on the target OS/arch in CI when native modules misbehave.
 *
 * @param {import("app-builder-lib/out/core").BeforeBuildContext} context
 * @returns {Promise<boolean>} false = skip default rebuild; true = run default rebuild
 */
module.exports = async function beforeElectronBuild(context) {
  const targetOs = context.platform.nodeName;
  const hostOs = process.platform;

  if (targetOs === "darwin") {
    return true;
  }

  const targetArch = context.arch;
  const hostArch =
    process.arch === "x64" ? "x64" : process.arch === "arm64" ? "arm64" : process.arch;

  const crossTarget = hostOs !== targetOs || (targetArch && hostArch !== targetArch);

  if (crossTarget) {
    console.warn(
      "[beforeElectronBuild] Skipping @electron/rebuild: host is %s/%s but packager target is %s/%s; node-gyp cannot cross-compile. Using node_modules as-is (often prebuilds). For a guaranteed-good build, run electron-builder on the target OS/arch (e.g. GitHub Actions windows-latest).",
      hostOs,
      hostArch,
      targetOs,
      targetArch
    );
    return false;
  }

  const { rebuild } = await import("@electron/rebuild");
  await rebuild({
    buildPath: context.appDir,
    electronVersion: context.electronVersion,
    platform: targetOs,
    arch: context.arch,
    projectRootPath: context.appDir,
    ignoreModules: ["electron-liquid-glass"],
    disablePreGypCopy: true,
  });

  return false;
};
