var fs = require( 'fs' );
var path = require( 'path' );
var assert = require( 'assert' );
var through = require( 'through' );
var browserify = require( 'browserify' );
var jsdom = require( 'jsdom' );
var nunjucksify = require( '..' );
var nunjucks = require( 'nunjucks' );


it( 'Renders the same in node and in dom', function ( done ) {
  compareWithNunjucksRender( 'compare-with-nunjucks-render', done );
});

it( 'Correctly extends block', function ( done ) {
  compareWithNunjucksRender( 'test-extends', done );
});

it( 'Correctly compiles recursive dependencies', function ( done ) {
  compareWithNunjucksRender( 'resolve-recursive-dependencies', done );
});

it( 'Accepts custom file extension as string', function ( done ) {
  compareWithNunjucksRender( 'test-file-extension-config', done, {
    templateName: 'template.html',
    nunjucksify: {
      extension: '.html'
    }
  });
});

it( 'Accepts custom file extension as array', function ( done ) {
  compareWithNunjucksRender( 'test-file-extension-config', done, {
    templateName: 'template.html',
    nunjucksify: {
      extension: ['.html']
    }
  });
});

it( 'Prevent duplicate require calls for the same template', function ( done ) {
  compileBundle('prevent-duplicate-require-calls', function ( err, bundleSource ) {
    var regExp = new RegExp( 'require\\( "\\./partial\\.nunj" \\);', 'g' );
    var matches = bundleSource.match( regExp );
    assert( matches );
    assert.equal( matches.length, 1 );
    done();
  });
});


function compareWithNunjucksRender( testName, done, opts ) {

  compileBundle( testName, function ( err, bundleSource ) {
    jsdom.jsdom.env( {
      html : '<html><head></head><body></body></html>',
      src: [bundleSource],
      done : function ( errors, window ) {
        if ( errors ) {
          return done( errors[0].data.error );
        }
        var context = require( resolveTestPath( testName, 'context.json' ) );
        // Render from string to overcome cache
        var templateName = (opts && opts.templateName) || 'template.nunj';
        var template = fs.readFileSync( resolveTestPath( testName, templateName ) ).toString( 'utf8' );
        nunjucks.renderString( template, context, function ( err, desiredOutput ) {
          if ( err ) {
            return done( err );
          }
          assert.equal( window.document.body.innerHTML, desiredOutput );
          done();
        } );
      }
    } );
  }, opts && opts.nunjucksify );
}


function compileBundle( testName, done, opts ) {
  var data = '';
  process.chdir( resolveTestPath( testName ) );
  return browserify()
    .transform( nunjucksify, opts || {} )
    .add(resolveTestPath( testName, 'bundle.js' ) )
    .bundle()
    .pipe(
      through(
        function write( buf ) { data += buf; },
        function end() { done( null, data ); }
      )
    );
}


function resolveTestPath() {
  var args = Array.prototype.slice.call( arguments, 0 );
  args.unshift( __dirname );
  return path.resolve.apply( path, args );
}
