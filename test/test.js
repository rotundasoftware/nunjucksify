var fs = require( 'fs' );
var path = require( 'path' );
var assert = require( 'assert' );
var through = require( 'through' );
var browserify = require( 'browserify' );
var jsdom = require( 'jsdom' ).jsdom;
var nunjucksify = require( '..' );
var nunjucks = require( 'nunjucks' );


specify( 'Renders the same in node and in dom', function ( done ) {
  compareWithNunjucksRender( 'compare-with-nunjucks-render', done );
});

specify( 'Correctly extends block', function ( done ) {
  compareWithNunjucksRender( 'test-extends', done );
});

specify( 'Correctly compiles recursive dependencies', function ( done ) {
  compareWithNunjucksRender( 'resolve-recursive-dependencies', done );
});

specify( 'Uses custom file extension configuration', function ( done ) {
  var previousExtensions = nunjucksify.extensions;
  nunjucksify.extensions = ['.html'];
  compileBundle('test-file-extension-config', function ( err, bundleSource ) {
    nunjucksify.extensions = previousExtensions;
    jsdom.env({
      html : '<html><body></body></html>',
      src : [ bundleSource ],
      done : function ( errors, window ) {
        if ( errors ) {
          return done( errors[0].data.error );
        }
        assert.equal( window.document.body.innerHTML, 'Using custom extension' );
        done();
      }
    });
  },{
    extensions: ['.html']
  });
});

specify( 'Prevent duplicate require calls for the same template', function ( done ) {
  compileBundle('prevent-duplicate-require-calls', function ( err, bundleSource ) {
    var regExp = new RegExp( 'require\\( "\\./partial\\.nunj" \\);', 'g' );
    var matches = bundleSource.match( regExp );
    assert( matches );
    assert.equal( matches.length, 1 );
    done();
  });
});


function compareWithNunjucksRender( testName, done ) {
  compileBundle( testName, function ( err, bundleSource ) {
    jsdom.env( {
      html : '<html><body></body></html>',
      src : [ bundleSource ],
      done : function ( errors, window ) {
        if ( errors ) {
          return done( errors[0].data.error );
        }
        var context = require( resolveTestPath( testName, 'context.json' ) );
        // Render from string to overcome cache
        var template = fs.readFileSync( resolveTestPath( testName, 'template.nunj' ) ).toString( 'utf8' );
        nunjucks.renderString( template, context, function ( err, desiredOutput ) {
          if ( err ) {
            return done( err );
          }
          assert.equal( window.document.body.innerHTML, desiredOutput );
          done();
        } );
      }
    } );
  } );
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
