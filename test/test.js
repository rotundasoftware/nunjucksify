var fs = require('fs');
var path = require('path');
var assert = require('assert');
var through = require('through');
var browserify = require('browserify');
var jsdom = require('jsdom').jsdom;
var nunjucksify = require('..');
var nunjucks = require('nunjucks');


specify('Renders the same in node and in dom', function (done) {
  compareWithNunjucksRender('compare-with-nunjucks-render', done);
});


specify('Prevent duplicate require calls for the same template', function (done) {
  compileBundle('prevent-duplicate-require-calls', function (err, bundleSource) {
    var regExp = new RegExp('require\\( "\\./partial\\.nunj" \\);', 'g');
    var matches = bundleSource.match(regExp);
    assert(matches);
    assert.equal(matches.length, 1);
    done();
  });
});


function compareWithNunjucksRender (testName, done) {
  process.chdir(resolveTestPath(testName));
  var context = require(resolveTestPath(testName, 'context.json'));
  var desiredOutput = nunjucks.render('template.nunj', context);
  compileBundle(testName, function (err, bundleSource) {
    var window = jsdom('<html><head></head><body></body></html>').parentWindow;
    var scriptEl = window.document.createElement('script');
    scriptEl.textContent = bundleSource;
    window.document.head.appendChild(scriptEl);
    assert.equal(window.document.body.innerHTML, desiredOutput);
    done();
  });
}


function compileBundle (testName, done) {
  var data = '';
  return browserify()
    .transform(nunjucksify)
    .add(resolveTestPath(testName, 'bundle.js'))
    .bundle()
    .pipe(
      through(
        function write (buf) { data += buf; },
        function end () { done(null, data); }
      )
    );
}


function resolveTestPath () {
  var args = Array.prototype.slice.call(arguments, 0);
  args.unshift(__dirname);
  return path.resolve.apply(path, args);
}
