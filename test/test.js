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
  compileBundle(testName, function (err, bundleSource) {
    jsdom.env({
      html: '<html><body></body></html>',
      src: [bundleSource],
      done: function (errors, window) {
        if (errors) {
          return done(errors[0].data.error);
        }
        var context = require(resolveTestPath(testName, 'context.json'));
        var desiredOutput = nunjucks.render('template.nunj', context);
        assert.equal(window.document.body.innerHTML, desiredOutput);
        done();
      }
    });
  });
}


function compileBundle (testName, done) {
  var data = '';
  process.chdir(resolveTestPath(testName));
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
