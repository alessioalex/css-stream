'use strict';

const path = require('path');

function normalizePaths(items, projectRoot) {
  function getPathToModule(moduleName) {
    return path.join(projectRoot, 'node_modules', moduleName);
  }

  // items is an array that can contain the following:
  // - a path to a file: path/to/file.css
  // - an npm module name (that is a direct dependency of the project): bootstrap
  // (we will look for the 'style' property inside `package.json` for its css)
  // - a key-value pair containing the module name and its css relative path: bootstrap: 'dist/bootstrap.css'
  return items.map((item) => {
    const isString = (typeof item === 'string');

    // option #1: path to css file, ex: '/foo/bar/baz.css'
    if (isString && /\.css$/.test(item)) {
      if (item.indexOf(projectRoot) !== -1) {
        return item;
      }

      return path.join(projectRoot, item);
    }

    // option #2: module: relativePathToCssFile, ex: bootstrap: 'dist/bootstrap.css'
    if (!isString) {
      const moduleName = Object.keys(item)[0];

      return path.join(getPathToModule(moduleName), item[moduleName]);
    }

    // option #3: module name, search for 'style' prop inside module's package.json file
    const modulePath = getPathToModule(item);
    const pkgJson = require(modulePath + '/package.json');

    if (typeof pkgJson.style === 'string') {
      return path.join(modulePath, pkgJson.style);
    }

    // nothing? must be an error if you got `ere
    throw new Error('Invalid style property for module ' + item);
  });
}

module.exports = normalizePaths;
