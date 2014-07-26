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

		// Check for subtemplates
		var segments = {};
		var match;
		var re = /<nunjucks name=\"(.+?)\">([^]+?)<\/nunjucks>/gim;

		if(re.test(data)) {
			re.lastIndex = 0;
			// Split this file into multiple segments
			while(match = re.exec(data))
				segments[match[1]] = match[2];
		}
		else
			segments["main"] = data;

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

		// "this" below is the old root context, bound to this instantiation later in the generated code.
		// This allows the function to be used for subtemplates
		compiledTemplate += '	this( env, context, frame, runtime, function( err, res ) {\n';
		compiledTemplate += '		env.getTemplate = oldGetTemplate;\n';
		compiledTemplate += '		cb( err, res );\n';
		compiledTemplate += '	} );\n';
		compiledTemplate += '};\n';

		for(var key in segments) {
			try {
				nunjucksCompiledStr = nunjucks.precompileString( segments[key], {
					name : tmplShasum+key,
					env : opts.env
				} );
			} catch( err ) {
				this.queue( null );
				return this.emit( 'error', err );
			}

			var reg = /env\.getTemplate\(\"(.*?)\"/g;

			while( match = reg.exec( nunjucksCompiledStr ) )
				compiledTemplate += 'require( "' + match[1] + '" );\n';

			compiledTemplate += nunjucksCompiledStr;
			compiledTemplate += 'var obj_' + key + ' = window.nunjucksPrecompiled[ "' + tmplShasum+key + '" ];\n';
			compiledTemplate += 'var oldRoot_' + key + ' = obj_' + key + '.root;\n';

			compiledTemplate += 'var info_' + key + ' = {\n';
			compiledTemplate += '	src: {\n';
			compiledTemplate += '		obj: obj_' + key + ',\n';
			compiledTemplate += '		type: "code"\n';
			compiledTemplate += '	},\n';
			compiledTemplate += '	path : "' + tmplShasum+key + '"\n';
			compiledTemplate += '};\n';
			compiledTemplate += 'info_' + key + '.src.obj.root = newRoot.bind(oldRoot_' + key + ');\n';
		}

		if(Object.keys(segments).length == 1 && segments["main"])
			compiledTemplate += 'module.exports = new nunjucks.Template( info_main.src, env, info_main.path, true );\n';
		else {
			compiledTemplate += "module.exports = {\n";
			for(var name in segments)
				compiledTemplate += '	"' + name + '": new nunjucks.Template( info_' + name + '.src, env, info_' + name + '.path, true ),';
			compiledTemplate += "};\n";
		}

		this.queue( compiledTemplate );
		this.queue( null );
	}
};