# es6modulesnow - ALPHA VERSION!

Bring ES6 modules to the browser, today.

Simply write modules with the [ES6 style](http://wiki.ecmascript.org/doku.php?id=harmony:modules_examples) and this library will load and compile them into AMD compatible modules. There are two ways to include ES6 modules in your web app:

## Harmony opt-in

Include the es6modulesnow library in your page and then simple add harmony compatible script tags like so:

```html  
<script src="es6modulesnow.min.js"></script>
<script type="application/harmony" data-src="main.js"></script>
```

## System loader

A system module loader is also included and can be used:

```html
<script src="es6modulesnow.min.js"></script>
<script>
System.load('main.js', function(mainModule) {
  // Do stuff with your module.
});
</script>
```

## Credit

Most of the work of this project has been done by others. I merely pieced together these packages (and to some degree bent them to my needs):

* [es6-module-transpiler](https://github.com/square/es6-module-transpiler) - Does the hard work of transpiling the ES6 module system into AMD modules. This project works in Node, so if you are hoping for a compile-time solution, this is probably the way to go. I merely broke this package apart into the pieces I needed and removed the Node dependencies.

* [es6-module-loader](https://github.com/addyosmani/es6-module-loader) - Provides module loading capabilities.

* [Almond](https://github.com/jrburke/almond) - Rather than build my own dependency manager, I just use Almond.
