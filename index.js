var through = require( "through" );
var nunjucks = require( "nunjucks" );
var path = require( "path" );

module.exports = function( file, opts ) {
	opts = opts || {};
	var env = opts.env || nunjucks.env || new nunjucks.Environment();
	var extension = opts.extension || ['.nunj'];

	if ( !(extension instanceof Array) ) extension = [extension];

	var data = "";
	if( file !== undefined && extension.indexOf( path.extname( file ) ) === -1 )
		return through();
	else
		return through( write, end );

	function write(buf) {
		data += buf;
	}

	function end() {
		var compiledTemplate = '';

		compiledTemplate += 'var nunjucks = require( "nunjucks" );\n';
		compiledTemplate += 'var env = nunjucks.env || new nunjucks.Environment();\n';

		var nunjucksCompiledStr;

		try {
			nunjucksCompiledStr = nunjucks.compiler.compile( data, env.asyncFilters, env.extensionsList );
		} catch( err ) {
			this.queue( null );
			return this.emit( 'error', err );
		}

		var reg = /env\.getTemplate\(\"(.*?)\"/g;
		var match;
		var required = {};
		while( match = reg.exec( nunjucksCompiledStr ) ) {
			var templateRef = match[1];
			if (!required[templateRef]) {
				compiledTemplate += 'require( "' + templateRef + '" );\n';
				required[templateRef] = true;
			}
		}

		compiledTemplate += 'var obj = (function () {' + nunjucksCompiledStr + '})();\n';
		compiledTemplate += 'module.exports = require( "nunjucksify/runtime-shim" )(nunjucks, env, obj, require);\n';

		this.queue( compiledTemplate );
		this.queue( null );
	}
};

