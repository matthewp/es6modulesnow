var fs = require('fs');

var files = [
  'almond.js',
  'script_builder.js',
  'javascript_builder.js',
  'abstract_compiler.js',
  'amd_compiler.js',
  'compiler.js',
  'load.js',
  'es6-module-loader.js'
];

var out = '(function() {\n'
  + 'var root = {};\n'

files.forEach(function(file) {
  var data = fs.readFileSync('src/' + file, 'utf8');
  out += data;
});

out += '\n})();'

fs.writeFile('es6-modules-now.js', out, function() {
  console.log('Build successful.');
  process.exit();
});
