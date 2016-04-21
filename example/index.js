/* eslint-disable no-console, func-names */
'use strict';

const path = require('path');
const crypto = require('crypto');
const DataUri = require('datauri');
const rimraf = require('rimraf');
const mkdirp = require('mkdirp');
const isImage = require('is-image');
const fse = require('fs-extra');
const through2 = require('through2');
const cssStream = require('../');

const rootDir = __dirname;
// const paths = [{ 'bootstrap': 'dist/css/bootstrap.min.css' }, 'flat-ui'];
const paths = ['bootstrap', 'flat-ui'];
const buildDir = __dirname + '/public/assets';
const prefix = 'http://localhost:3000/assets';
const cssOut = buildDir + '/style.css';
const sizeLimit = 8 * 1024; // < 8 Kb imgs get converted to datauri

rimraf.sync(buildDir);
mkdirp.sync(buildDir);
['images', 'fonts', 'others'].forEach((dataType) => {
  mkdirp.sync(buildDir + '/' + dataType);
});

function isFont(filePath) {
  const knownFontExts = ['woff', 'woff2', 'eot', 'ttf'];

  if (knownFontExts.indexOf(path.extname(filePath).slice(1)) !== -1) {
    return true;
  }

  return false;
}

cssStream(paths, rootDir, function processRelativeUrl(relativeUrl, cb) {
  function copyAndRename(opts) {
    fse.readFile(opts.filePath, 'utf8', function readFileCb(err, data) {
      if (err) { return cb(err); }

      const hash = crypto.createHash('md5').update(data).digest('hex').slice(0, 6);
      let newBasename = path.basename(opts.relativePath.replace(opts.ext, '-' + hash + opts.ext));
      let dataType = 'others';

      if (/\.svg$/.test(opts.filePath)) {
        try {
          // naive check to see if svg is font
          const CHUNK_SIZE = 3 * 1024;
          const buffer = new Buffer(CHUNK_SIZE);
          const fd = fse.openSync(opts.filePath, 'r');
          const nread = fse.readSync(fd, buffer, 0, CHUNK_SIZE, null);
          const looksLikeFont = /font id/i.test(buffer.slice(0, nread).toString('utf8'));
          fse.closeSync(fd);

          dataType = looksLikeFont ? 'fonts' : 'images';
        } catch (e) {
          // meh, whatevs
          dataType = 'images';
        }
      } else if (isImage(opts.filePath)) {
        dataType = 'images';
      } else if (isFont(opts.filePath)) {
        dataType = 'fonts';
      }

      // just making sure everything is in their right folders (images, fonts, etc)
      const copyLoc = path.join(buildDir, dataType, newBasename);

      fse.copy(opts.filePath, copyLoc, function writeFileCb(e) {
        cb(e, opts.prefix + '/' + dataType + '/' + newBasename + opts.queryStringAndHash);
      });
    });
  }

  function stripQueryStringAndHashFromPath(url) {
    return url.split('?')[0].split('#')[0];
  }

  const relativePath = stripQueryStringAndHashFromPath(relativeUrl);
  const queryStringAndHash = relativeUrl.substring(relativePath.length);

  const filePath = path.join(rootDir, relativePath);
  const ext = path.extname(relativePath);
  const copyOpts = { filePath, relativePath, ext, prefix, queryStringAndHash };

  // base64 inline small images to avoid HTTP roundtrip
  if (isImage(relativePath)) {
    fse.stat(filePath, function statCb(err, stats) {
      if (err) { return cb(err); }

      if (stats.size <= sizeLimit) {
        // Embed image data with data URI
        const dUri = new DataUri(path.join(rootDir, relativeUrl));

        cb(null, dUri.content);
      } else {
        copyAndRename(copyOpts);
      }
    });
  }

  copyAndRename(copyOpts);
})
  .on('error', (err) => {
    console.error('something went bad with the cssStream');
    throw err;
  })
  .pipe(through2.obj(function write(chunk, enc, cb) {
    // ignore sourcemaps from concatenated files
    if (/sourceMappingURL/i.test(chunk.line)) {
      return cb();
    }

    this.push(chunk.line);
    cb();
  }))
  .pipe(fse.createWriteStream(cssOut))
  .on('error', (err) => {
    console.error('something went bad when saving the css file');
    throw err;
  })
  .on('finish', () => {
    console.log('all done, checkout css file %s && other assets inside %s', cssOut, buildDir);
  });
