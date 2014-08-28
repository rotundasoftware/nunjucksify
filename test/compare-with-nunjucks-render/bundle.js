var template = require( './template.nunj' );
var context = require( './context.json' );
document.body.innerHTML = template.render( context );
