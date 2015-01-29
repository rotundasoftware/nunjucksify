var template = require( './template.html' );
var context = require( './context.json' );
document.body.innerHTML = template.render( context );
