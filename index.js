var through = require( "through" );
var nunjucks = require( "nunjucks" );
var path = require( "path" );
var shasum = require( "shasum" );

module.exports = function( file, opts ) {
	opts = opts || {};

	var data = "";
	if( file !== undefined && path.extname( file ) !== ".nunj" )
		return through();
	else
		return through( write, end );

	function write(buf) {
		data += buf;
	}

	function end() {
		var compiledTemplate = '';

		compiledTemplate += 'var nunjucks = require( "nunjucks" );\n';
		compiledTemplate += 'var window = {};\n';

		compiledTemplate += 'var env = nunjucks.env || new nunjucks.Environment();\n';

		compiledTemplate += 'var localLoader = {\n';
		compiledTemplate += '	getSource : function( name ) {\n';
		compiledTemplate += '		return require( name );\n';
		compiledTemplate += '	}\n';
		compiledTemplate += '};\n';

		var nunjucksCompiledStr;

		var tmplShasum = shasum( data );

		try {
			nunjucksCompiledStr = nunjucks.precompileString( data, {
				name : tmplShasum,
				env : opts.env
			} );
		} catch( err ) {
			this.queue( null );
			return this.emit( 'error', err );
		}

		var reg = /env\.getTemplate\(\"(.*?)\"/g;
		var match;
		while( match = reg.exec( nunjucksCompiledStr ) ) {
			var templateRef = match[1];
			compiledTemplate += 'require( "' + templateRef + '" );\n';
		}

		compiledTemplate += nunjucksCompiledStr;
		compiledTemplate += 'var oldRoot = window.nunjucksPrecompiled[ "' + tmplShasum + '" ].root;\n';

		compiledTemplate += 'var newRoot = function( env, context, frame, runtime, cb ) {\n';
		compiledTemplate += '	var oldGetTemplate = env.getTemplate;\n;';
		compiledTemplate += '	env.getTemplate = function( name, cb ) { cb( null, require( name ) ); };\n';
		compiledTemplate += '	oldRoot( env, context, frame, runtime, function( err, res ) {\n';
		compiledTemplate += '		env.getTemplate = oldGetTemplate;\n';
		compiledTemplate += '		cb( err, res );\n';
		compiledTemplate += '	} );\n';
		compiledTemplate += '};\n';
		
		compiledTemplate += 'var info = {\n';
		compiledTemplate += '	src: {\n';
		compiledTemplate += '		obj: { root : newRoot },\n';
		compiledTemplate += '		type: "code"\n';
		compiledTemplate += '	},\n';
		compiledTemplate += '	path : "' + tmplShasum + '"\n';
		compiledTemplate += '};\n';

		compiledTemplate += 'module.exports = new nunjucks.Template( info.src, env, info.path, false );\n';

		console.log( compiledTemplate );

		this.queue( compiledTemplate );
		this.queue( null );
	}
};