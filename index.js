var through = require( "through" );
var nunjucks = require( "nunjucks" );
var path = require( "path" );

module.exports = function( file, opts ) {
	opts = opts || {};
	var env = opts.env || new nunjucks.Environment();

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
		compiledTemplate += 'var oldRoot = obj.root;\n';
		compiledTemplate += 'obj.root = function( env, context, frame, runtime, cb ) {\n';
		compiledTemplate += '	var oldGetTemplate = env.getTemplate;\n';
		compiledTemplate += '	env.getTemplate = function( name, ec, cb ) {\n';
		compiledTemplate += '		if( typeof ec === "function" ) {\n';
		compiledTemplate += '			cb = ec;\n';
		compiledTemplate += '			ec = false;\n';
		compiledTemplate += '		}\n';

		compiledTemplate += '		var tmpl = (frame.get( "_require" ) || require)( name );\n';
		compiledTemplate += '		frame.set( "_require", require );\n';
		compiledTemplate += '		if( ec ) tmpl.compile();\n';
		compiledTemplate += '		cb( null, tmpl );\n';
		compiledTemplate += '	};';

		compiledTemplate += '	oldRoot( env, context, frame, runtime, function( err, res ) {\n';
		compiledTemplate += '		env.getTemplate = oldGetTemplate;\n';
		compiledTemplate += '		cb( err, res );\n';
		compiledTemplate += '	} );\n';
		compiledTemplate += '};\n';

		compiledTemplate += 'var src = {\n';
		compiledTemplate += '	obj: obj,\n';
		compiledTemplate += '	type: "code"\n';
		compiledTemplate += '};\n';

		compiledTemplate += 'module.exports = new nunjucks.Template( src, env );\n';

		this.queue( compiledTemplate );
		this.queue( null );
	}
};
