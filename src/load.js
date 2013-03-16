(function() {
var oldRequire = require,
    Compiler = root.Compiler;
    
root.load = function(dep) {
  var depName = asJs(root.normalize(dep));
  var rawSrc = syncGet(depName);
  var cc = new Compiler(rawSrc, dep);
  var src = cc.toAMD();
  src += '\n//@ sourceURL=' + System.baseURL + depName;
  var fn = new Function('define', 'require', src);
  fn.apply(null, [define, require]);
};

function asJs(name) {
  return name.indexOf('.js') === name.length - 3
    ? name
    : name + '.js';
}

function syncGet(path) {
  var req = new XMLHttpRequest();
  req.open('GET', path, false);
  req.send();
  
  if(req.status !== 200) {
    throw 'Unable to retrieve ' + path;
  } else {
    return req.responseText;
  }
}
})();
