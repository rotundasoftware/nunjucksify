var nunjucksify = require( "../index.js" );
var fs = require( "fs" );

fs.createReadStream( "template1.nunj" ).pipe( nunjucksify() ).pipe( process.stdout );