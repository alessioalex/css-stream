'use strict';

const fs = require('fs');
const splitStream = require('split-transform-stream');
const through2 = require('through2');
const eachAsync = require('tiny-each-async');
const eos = require('end-of-stream');
const processUrl = require('./lib/process-url');
const normalizePaths = require('./lib/normalize-paths');

function createStream(paths, root, processRelativeUrl) {
  const outerStream = through2.obj();

  const files = normalizePaths(paths, root);

  eachAsync(files, 1, function createFileStream(file, next) {
    const spStream = splitStream(
      fs.createReadStream(file, 'utf8'),
      function write(line, enc, cb) {
        const that = this;
        const urls = [];
        let i = 0;

        // gather urls and store some placeholders instead, which we later replace
        let tmpLine = processUrl(line, function processUrlCb(u) {
          urls.push(u);
          const placeholder = '%PLACEHOLDER_' + i + '%';
          i++;

          return placeholder;
        }, root, file);

        eachAsync(urls, function replaceWithProcessedUrl(url, index, next2) {
          processRelativeUrl(url, function getUpdatedUrl(e, updatedUrl) {
            if (e) { return next(e); }

            tmpLine = tmpLine.replace('%PLACEHOLDER_' + index + '%', updatedUrl);
            next2();
          });
        }, function urlProcessingCb(err) {
          if (err) { throw err; }

          that.push({
            line: tmpLine + '\n',
            file: file
          });
          cb();
        });
      }
    )
      .on('data', function splitStreamData(chunk) {
        outerStream.push(chunk);
      });

    eos(spStream, next);
  }, function onStreamsEnd(err) {
    if (err) {
      outerStream.emit('error', err);
    } else {
      outerStream.push(null);
    }
  });

  return outerStream;
}

module.exports = createStream;
