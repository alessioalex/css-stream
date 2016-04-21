'use strict';

const path = require('path');
const test = require('tape');
const eos = require('end-of-stream');
const cssStream = require('../../');
const fs = require('fs');

test('css-stream', (t) => {
  const root = path.resolve(__dirname + '/../fixtures');
  const paths = [ root + '/moduleA.css', root + '/moduleB.css' ];

  function processRelativeUrl(url, cb) {
    cb(null, url.toUpperCase());
  }

  let streamData = '';

  const stream = cssStream(paths, root, processRelativeUrl)
    .on('data', (d) => {
      streamData += d.line;
    });

  eos(stream, { writable: false }, (err) => {
    if (err) { throw err; }

    t.equal(fs.readFileSync(root + '/out.css', 'utf8'), streamData);
    t.end();
  });
});
