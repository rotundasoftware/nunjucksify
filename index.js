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

		var nunjucksCompiledStr;

		var tmplShasum = shasum( __filename );

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
		var required = {};
		while( match = reg.exec( nunjucksCompiledStr ) ) {
			var templateRef = match[1];
			if (!required[templateRef]) {
				compiledTemplate += 'require( "' + templateRef + '" );\n';
				required[templateRef] = true;
			}
		}

		compiledTemplate += nunjucksCompiledStr;
		compiledTemplate += 'var obj = window.nunjucksPrecompiled[ "' + tmplShasum + '" ];\n';
		compiledTemplate += 'var oldRoot = obj.root;\n';

		compiledTemplate += 'var newRoot = function( env, context, frame, runtime, cb ) {\n';
		compiledTemplate += '	var oldGetTemplate = env.getTemplate;\n';
		compiledTemplate += '	env.getTemplate = function( name, ec, cb ) {\n';
		compiledTemplate += '		if( typeof ec === "function" ) {\n';
		compiledTemplate += '			cb = ec;\n';
		compiledTemplate += '			ec = false;\n';
		compiledTemplate += '		}\n';

		compiledTemplate += '		var tmpl = require( name );\n';
		compiledTemplate += '		if( ec ) tmpl.compile();\n';
		compiledTemplate += '		cb( null, tmpl );\n';
		compiledTemplate += '	};';

		compiledTemplate += '	oldRoot( env, context, frame, runtime, function( err, res ) {\n';
		compiledTemplate += '		env.getTemplate = oldGetTemplate;\n';
		compiledTemplate += '		cb( err, res );\n';
		compiledTemplate += '	} );\n';
		compiledTemplate += '};\n';

		compiledTemplate += 'var info = {\n';
		compiledTemplate += '	src: {\n';
		compiledTemplate += '		obj: obj,\n';
		compiledTemplate += '		type: "code"\n';
		compiledTemplate += '	},\n';
		compiledTemplate += '	path : "' + tmplShasum + '"\n';
		compiledTemplate += '};\n';
		compiledTemplate += 'info.src.obj.root = newRoot;\n';

		compiledTemplate += 'module.exports = new nunjucks.Template( info.src, env, info.path, true );\n';

		this.queue( compiledTemplate );
		this.queue( null );
	}
};
