/* eslint-disable */
'use strict';

// Extracted from browserify-css, MIT license: https://raw.githubusercontent.com/cheton/browserify-css/89d4b6386c2fe88592d5ae2ff569562d8b2353f6/LICENSE
// https://github.com/cheton/browserify-css/blob/89d4b6386c2fe88592d5ae2ff569562d8b2353f6/css-transform.js#L75-L106

const path = require('path');

var rebase = function(source, processRelativeUrl, rootDir, filename) {
    var absUrlRegEx = /^(\/|data:)/;
    var protocolRegEx = /[^\:\/]*:\/\/([^\/])*/;
    var urlRegEx = /url\s*\((?!#)\s*(\s*"([^"]*)"|'([^']*)'|[^\)]*\s*)\s*\)/ig;
    var r;
    while ((r = urlRegEx.exec(source))) {
        var url = r[2] || // url("path/to/foo.css");
                  r[3] || // url('path/to/foo.css');
                  r[1] || // url(path/to/foo.css)
                  '';
        var quoteLen = ((r[2] || r[3]) && r[1]) ? 1 : 0;
        var newUrl = url;

        if ( ! url.match(absUrlRegEx) && ! url.match(protocolRegEx)) {
            // If both r[2] and r[3] are undefined, but r[1] is a string, it will be the case of url(path/to/foo.css).
            quoteLen = ((r[2] || r[3]) && r[1]) ? 1 : 0;

            var dirname = path.dirname(filename);
            var from = rootDir,
                to = path.resolve(dirname, url);

            newUrl = processRelativeUrl(path.relative(from, to));
            newUrl = newUrl.replace(/\\/g, '/'); // All URLs must use forward slashes

            source = source.substr(0, urlRegEx.lastIndex - url.length - quoteLen - 1) + newUrl + source.substr(urlRegEx.lastIndex - quoteLen - 1);
        }

        urlRegEx.lastIndex = urlRegEx.lastIndex + (newUrl.length - url.length);
    }

    return source;
};

module.exports = rebase;
