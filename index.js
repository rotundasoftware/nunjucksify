var through = require( 'through' );
var nunjucks = require( 'nunjucks' );
var path = require( 'path' );

module.exports = function( file, opts ) {
	opts = opts || {};
	var env = opts.env || nunjucks.env || new nunjucks.Environment();
	var extension = opts.extension || [ '.nunj', '.njk' ];
	var rootDir = opts.rootDir;

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
		
		compiledTemplate += 'var nunjucks = require( "nunjucks/browser/nunjucks-slim" );\n';
		
		var templateName = file;
		if( opts.rootDir ) templateName = path.relative( opts.rootDir, templateName );
		
		precompiledTemplateString = nunjucks.precompileString( data, {
            env : env,
            name : templateName,
            asFunction : true
        } );

		compiledTemplate += 'module.exports = ' + precompiledTemplateString + ';\n';

		this.queue( compiledTemplate );
		this.queue( null );
	}
};

