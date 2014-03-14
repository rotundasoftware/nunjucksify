var through = require( "through" );
var nunjucks = require( "nunjucks" );
var path = require( "path" );
var shasum = require( "shasum" );

module.exports = function( file ) {
	var data = "";
	if( file !== undefined && path.extname( file ) !== ".nunj" )
		return through();
	else
		return through( write, end );

	function write(buf) {
		data += buf;
	}

	function end() {
		// tbd: should we require something smaller runtime-only component instead?
		var compiledTemplate = "var nunjucks = require( 'nunjucks' ); module.exports = ( function() { return ";

		// using the shasum of the data for the template name since the template name isn't going to be used anywhere
		// outside of the file requiring this template, but we want it to be unique since nunjucks adds it to window.nunjucksPrecompiled
		compiledTemplate += nunjucks.precompileString( data, { asFunction : true, name : shasum( data ) } );
		compiledTemplate += " })()";

		this.queue( compiledTemplate );
		this.queue( null );
	}
};