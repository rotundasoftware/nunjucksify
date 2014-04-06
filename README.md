# Nunjucksify

A transform stream that precompiles [nunjucks](http://jlongster.github.io/nunjucks/) templates.

* Compatible with [browserify](http://jlongster.github.io/nunjucks/api.html#template), [parcelfiy](https://github.com/rotundasoftware/parcelify), and [cartero](https://github.com/rotundasoftware/cartero).
* Uses the node resolve algorithm for nunjucks `{% includes %}` and `{% extends %}` tags.
* Completely encapsulated - does not depend on the global scope.

Include nunjucksify as a package transform. When you `require` a file that ends with `.nunj` in that package, nunjucksify will transform that template into a module that returns a nunjucks [Template object](http://jlongster.github.io/nunjucks/api.html#template).

In `myWidget.nunj`:

```jinja
<div>{{ menu }}</div>
```

Now in `myWidget.js`:

```javascript
var $ = require( 'jquery' )
var tmpl = require( './myWidget.nunj' );

console.log( tmpl.render( { menu : 'chorizo' } ) ); // outputs '<div>chorizo</div>'
```

But wait, there's more.

Nunjucksify overrides `evn.getTemplate()` within precompiled code so that the [node `require.resolve()` algorthim](http://nodejs.org/docs/v0.4.8/api/all.html#all_Together...) is used to resolve references in  `{% includes %}` and `{% extends %}` tags. As a result you can reference templates using relative paths:

```jinja
{% extends "./morcilla.nunj" %}

{% block content %}
Yes, please.
{% endblock %}
```

Or even reference a template in a module within a `node_modules` directory:

```jinja
{% include "my-module/foo.nunj" %}
```

Poom para arriba!

## Usage

Make sure nunjuckify is a dependency of your package.

```
$ cd path/to/my-package
$ npm install nunjucksify --save
```

Declare nunucksify as transform in `package.json` by adding `nunjucksify` to the array in the `browserify.transform` property. Cook 10-15 until crispy.

### Caring for the environment

If you want your templates to use a particular nunjucks [Environment object](http://jlongster.github.io/nunjucks/api.html#environment), attach the environment object to `nunjucks.evn`. For example, the following makes a `subview` filter available to all your templates for use with [backbone.subviews](https://github.com/rotundasoftware/backbone.subviews#template-helpers). (If `nunjucks.env` is undefined, a new environment is created for each template.)

```javascript
var nunjucks = require( 'nunjucks' );

nunjucks.env = new nunjucks.Environment();

nunjucks.env.addFilter( 'subview', function( templateName ) {
	return '<div data-subview="' + templateName + '"></div>';
} );
```

## License

MIT