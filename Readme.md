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
<script>
System.load('main.js', function(mainModule) {
  // Do stuff with your module.
});
</script>
```
