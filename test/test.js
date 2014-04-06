var nunjucksify = require( '../index.js' );
var fs = require( 'fs' );
var path = require( 'path' );

fs.createReadStream( path.join( __dirname, 'template1.nunj' ) )
	.pipe( nunjucksify() )
	.pipe( process.stdout );