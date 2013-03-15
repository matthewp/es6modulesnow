(function() {
var root = {};
/**
 * almond 0.2.5 Copyright (c) 2011-2012, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/almond for details
 */
//Going sloppy to avoid 'use strict' string cost, but strict practices should
//be followed.
/*jslint sloppy: true */
/*global setTimeout: false */

var requirejs, require, define;
(function (undef) {
    var main, req, makeMap, handlers,
        defined = {},
        waiting = {},
        config = {},
        defining = {},
        hasOwn = Object.prototype.hasOwnProperty,
        aps = [].slice;

    function hasProp(obj, prop) {
        return hasOwn.call(obj, prop);
    }

    /**
     * Given a relative module name, like ./something, normalize it to
     * a real name that can be mapped to a path.
     * @param {String} name the relative name
     * @param {String} baseName a real name that the name arg is relative
     * to.
     * @returns {String} normalized name
     */
    function normalize(name, baseName) {
        var nameParts, nameSegment, mapValue, foundMap,
            foundI, foundStarMap, starI, i, j, part,
            baseParts = baseName && baseName.split("/"),
            map = config.map,
            starMap = (map && map['*']) || {};

        //Adjust any relative paths.
        if (name && name.charAt(0) === ".") {
            //If have a base name, try to normalize against it,
            //otherwise, assume it is a top-level require that will
            //be relative to baseUrl in the end.
            if (baseName) {
                //Convert baseName to array, and lop off the last part,
                //so that . matches that "directory" and not name of the baseName's
                //module. For instance, baseName of "one/two/three", maps to
                //"one/two/three.js", but we want the directory, "one/two" for
                //this normalization.
                baseParts = baseParts.slice(0, baseParts.length - 1);

                name = baseParts.concat(name.split("/"));

                //start trimDots
                for (i = 0; i < name.length; i += 1) {
                    part = name[i];
                    if (part === ".") {
                        name.splice(i, 1);
                        i -= 1;
                    } else if (part === "..") {
                        if (i === 1 && (name[2] === '..' || name[0] === '..')) {
                            //End of the line. Keep at least one non-dot
                            //path segment at the front so it can be mapped
                            //correctly to disk. Otherwise, there is likely
                            //no path mapping for a path starting with '..'.
                            //This can still fail, but catches the most reasonable
                            //uses of ..
                            break;
                        } else if (i > 0) {
                            name.splice(i - 1, 2);
                            i -= 2;
                        }
                    }
                }
                //end trimDots

                name = name.join("/");
            } else if (name.indexOf('./') === 0) {
                // No baseName, so this is ID is resolved relative
                // to baseUrl, pull off the leading dot.
                name = name.substring(2);
            }
        }

        //Apply map config if available.
        if ((baseParts || starMap) && map) {
            nameParts = name.split('/');

            for (i = nameParts.length; i > 0; i -= 1) {
                nameSegment = nameParts.slice(0, i).join("/");

                if (baseParts) {
                    //Find the longest baseName segment match in the config.
                    //So, do joins on the biggest to smallest lengths of baseParts.
                    for (j = baseParts.length; j > 0; j -= 1) {
                        mapValue = map[baseParts.slice(0, j).join('/')];

                        //baseName segment has  config, find if it has one for
                        //this name.
                        if (mapValue) {
                            mapValue = mapValue[nameSegment];
                            if (mapValue) {
                                //Match, update name to the new value.
                                foundMap = mapValue;
                                foundI = i;
                                break;
                            }
                        }
                    }
                }

                if (foundMap) {
                    break;
                }

                //Check for a star map match, but just hold on to it,
                //if there is a shorter segment match later in a matching
                //config, then favor over this star map.
                if (!foundStarMap && starMap && starMap[nameSegment]) {
                    foundStarMap = starMap[nameSegment];
                    starI = i;
                }
            }

            if (!foundMap && foundStarMap) {
                foundMap = foundStarMap;
                foundI = starI;
            }

            if (foundMap) {
                nameParts.splice(0, foundI, foundMap);
                name = nameParts.join('/');
            }
        }

        return name;
    }

    function makeRequire(relName, forceSync) {
        return function () {
            //A version of a require function that passes a moduleName
            //value for items that may need to
            //look up paths relative to the moduleName
            return req.apply(undef, aps.call(arguments, 0).concat([relName, forceSync]));
        };
    }

    function makeNormalize(relName) {
        return function (name) {
            return normalize(name, relName);
        };
    }

    function makeLoad(depName) {
        return function (value) {
            defined[depName] = value;
        };
    }

    function callDep(name) {
        if (hasProp(waiting, name)) {
            var args = waiting[name];
            delete waiting[name];
            defining[name] = true;
            main.apply(undef, args);
        }

        if (!hasProp(defined, name) && !hasProp(defining, name)) {
            throw new Error('No ' + name);
        }
        return defined[name];
    }

    //Turns a plugin!resource to [plugin, resource]
    //with the plugin being undefined if the name
    //did not have a plugin prefix.
    function splitPrefix(name) {
        var prefix,
            index = name ? name.indexOf('!') : -1;
        if (index > -1) {
            prefix = name.substring(0, index);
            name = name.substring(index + 1, name.length);
        }
        return [prefix, name];
    }

    /**
     * Makes a name map, normalizing the name, and using a plugin
     * for normalization if necessary. Grabs a ref to plugin
     * too, as an optimization.
     */
    makeMap = function (name, relName) {
        var plugin,
            parts = splitPrefix(name),
            prefix = parts[0];

        name = parts[1];

        if (prefix) {
            prefix = normalize(prefix, relName);
            plugin = callDep(prefix);
        }

        //Normalize according
        if (prefix) {
            if (plugin && plugin.normalize) {
                name = plugin.normalize(name, makeNormalize(relName));
            } else {
                name = normalize(name, relName);
            }
        } else {
            name = normalize(name, relName);
            parts = splitPrefix(name);
            prefix = parts[0];
            name = parts[1];
            if (prefix) {
                plugin = callDep(prefix);
            }
        }

        //Using ridiculous property names for space reasons
        return {
            f: prefix ? prefix + '!' + name : name, //fullName
            n: name,
            pr: prefix,
            p: plugin
        };
    };

    function makeConfig(name) {
        return function () {
            return (config && config.config && config.config[name]) || {};
        };
    }

    handlers = {
        require: function (name) {
            return makeRequire(name);
        },
        exports: function (name) {
            var e = defined[name];
            if (typeof e !== 'undefined') {
                return e;
            } else {
                return (defined[name] = {});
            }
        },
        module: function (name) {
            return {
                id: name,
                uri: '',
                exports: defined[name],
                config: makeConfig(name)
            };
        }
    };

    main = function (name, deps, callback, relName) {
        var cjsModule, depName, ret, map, i,
            args = [],
            usingExports;

        //Use name if no relName
        relName = relName || name;

        //Call the callback to define the module, if necessary.
        if (typeof callback === 'function') {

            //Pull out the defined dependencies and pass the ordered
            //values to the callback.
            //Default to [require, exports, module] if no deps
            deps = !deps.length && callback.length ? ['require', 'exports', 'module'] : deps;
            for (i = 0; i < deps.length; i += 1) {
                map = makeMap(deps[i], relName);
                depName = map.f;

                //Fast path CommonJS standard dependencies.
                if (depName === "require") {
                    args[i] = handlers.require(name);
                } else if (depName === "exports") {
                    //CommonJS module spec 1.1
                    args[i] = handlers.exports(name);
                    usingExports = true;
                } else if (depName === "module") {
                    //CommonJS module spec 1.1
                    cjsModule = args[i] = handlers.module(name);
                } else if (hasProp(defined, depName) ||
                           hasProp(waiting, depName) ||
                           hasProp(defining, depName)) {
                    args[i] = callDep(depName);
                } else if (map.p) {
                    map.p.load(map.n, makeRequire(relName, true), makeLoad(depName), {});
                    args[i] = defined[depName];
                } else {
                  root.load(map.n);
                  req(map.n);
                  args[i]= defined[depName];
                    //throw new Error(name + ' missing ' + depName);
                }
            }

            ret = callback.apply(defined[name], args);

            if (name) {
                //If setting exports via "module" is in play,
                //favor that over return value and exports. After that,
                //favor a non-undefined return value over exports use.
                if (cjsModule && cjsModule.exports !== undef &&
                        cjsModule.exports !== defined[name]) {
                    defined[name] = cjsModule.exports;
                } else if (ret !== undef || !usingExports) {
                    //Use the return value from the function.
                    defined[name] = ret;
                }
            }
        } else if (name) {
            //May just be an object definition for the module. Only
            //worry about defining if have a module name.
            defined[name] = callback;
        }
    };

    requirejs = require = req = function (deps, callback, relName, forceSync, alt) {
        if (typeof deps === "string") {
            if (handlers[deps]) {
                //callback in this case is really relName
                return handlers[deps](callback);
            }
            //Just return the module wanted. In this scenario, the
            //deps arg is the module name, and second arg (if passed)
            //is just the relName.
            //Normalize module name, if it contains . or ..
            return callDep(makeMap(deps, callback).f);
        } else if (!deps.splice) {
            //deps is a config object, not an array.
            config = deps;
            if (callback.splice) {
                //callback is an array, which means it is a dependency list.
                //Adjust args if there are dependencies
                deps = callback;
                callback = relName;
                relName = null;
            } else {
                deps = undef;
            }
        }

        //Support require(['a'])
        callback = callback || function () {};

        //If relName is a function, it is an errback handler,
        //so remove it.
        if (typeof relName === 'function') {
            relName = forceSync;
            forceSync = alt;
        }

        //Simulate async callback;
        if (forceSync) {
            main(undef, deps, callback, relName);
        } else {
            //Using a non-zero value because of concern for what old browsers
            //do, and latest browsers "upgrade" to 4 if lower value is used:
            //http://www.whatwg.org/specs/web-apps/current-work/multipage/timers.html#dom-windowtimers-settimeout:
            //If want a value immediately, use require('id') instead -- something
            //that works in almond on the global level, but not guaranteed and
            //unlikely to work in other AMD implementations.
            setTimeout(function () {
                main(undef, deps, callback, relName);
            }, 4);
        }

        return req;
    };
    
    /**
     * Provide access to a module's dependencies
     */
    root.deps = function(name) {
      return waiting[name] && waiting[name][1];
    };
    
    /**
     * Provide access to normalize
     */
    root.normalize = normalize;
    
    /**
     * Is a module already defined?
     */
    root.isDefined = function(depName) {
      return hasProp(defined, depName);
    };

    /**
     * Just drops the config on the floor, but returns req in case
     * the config return value is used.
     */
    req.config = function (cfg) {
        config = cfg;
        if (config.deps) {
            req(config.deps, config.callback);
        }
        return req;
    };

    define = function (name, deps, callback) {

        //This module may not have dependencies
        if (!deps.splice) {
            //deps is not an array, so probably means
            //an object literal or factory function for
            //the value. Adjust args.
            callback = deps;
            deps = [];
        }

        if (!hasProp(defined, name) && !hasProp(waiting, name)) {
            waiting[name] = [name, deps, callback];
        }
    };

    define.amd = {
        jQuery: true
    };
}());
(function() {
  "use strict";

  var BREAK, INDENT, OUTDENT, ScriptBuilder, Unique,
    __slice = [].slice;

  INDENT = {
    indent: true
  };

  OUTDENT = {
    outdent: true
  };

  BREAK = {
    "break": true
  };

  ScriptBuilder = (function() {

    ScriptBuilder.prototype["break"] = BREAK;

    ScriptBuilder.prototype.global = 'window';

    function ScriptBuilder() {
      this.buffer = [];
    }

    ScriptBuilder.prototype.useStrict = function() {
      return this.line('"use strict"');
    };

    ScriptBuilder.prototype.set = function(lhs, rhs) {
      return this.line("" + (this.capture(lhs)) + " = " + (this.capture(rhs)));
    };

    ScriptBuilder.prototype.call = function(fn, args) {
      var arg, end, i, indented, result, _i, _len;
      fn = this._wrapCallable(fn);
      args = this._prepareArgsForCall(args);
      end = args.length - 1;
      while (args[end] === BREAK) {
        end--;
      }
      result = "" + fn + "(";
      indented = false;
      for (i = _i = 0, _len = args.length; _i < _len; i = ++_i) {
        arg = args[i];
        if (arg === BREAK) {
          this.append(result);
          if (!indented) {
            indented = true;
            this.indent();
          }
          result = '';
        } else {
          result += arg;
          if (i < end) {
            result += ',';
            if (args[i + 1] !== BREAK) {
              result += ' ';
            }
          }
        }
      }
      result += ')';
      this.append(result);
      if (indented) {
        return this.outdent();
      }
    };

    ScriptBuilder.prototype._prepareArgsForCall = function(args) {
      var result,
        _this = this;
      if (typeof args === 'function') {
        result = [];
        args(function(arg) {
          return result.push(_this.capture(arg));
        });
        args = result;
      }
      return args;
    };

    ScriptBuilder.prototype._wrapCallable = function(fn) {
      var functionCalled, functionImpl, result,
        _this = this;
      if (typeof fn !== 'function') {
        return fn;
      }
      functionImpl = this["function"];
      functionCalled = false;
      this["function"] = function() {
        var args;
        args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
        functionCalled = true;
        return functionImpl.call.apply(functionImpl, [_this].concat(__slice.call(args)));
      };
      result = this.capture(fn);
      this["function"] = functionImpl;
      if (functionCalled) {
        result = "(" + result + (this._functionTail != null ? '' : '\n') + ")";
      }
      return result;
    };

    ScriptBuilder.prototype["function"] = function(args, body) {
      this.append(this._functionHeader(args));
      this.indent();
      body();
      this.outdent();
      if (this._functionTail != null) {
        return this.append(this._functionTail());
      }
    };

    ScriptBuilder.prototype.print = function(value) {
      return JSON.stringify(this.capture(value));
    };

    ScriptBuilder.prototype.prop = function(object, prop) {
      return this.append("" + (this.capture(object)) + "." + (this.capture(prop)));
    };

    ScriptBuilder.prototype.unique = function(prefix) {
      return new Unique(prefix);
    };

    ScriptBuilder.prototype.line = function(code) {
      return this.append(this.capture(code) + this.eol);
    };

    ScriptBuilder.prototype.append = function() {
      var code, _ref;
      code = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      return (_ref = this.buffer).push.apply(_ref, code);
    };

    ScriptBuilder.prototype.indent = function() {
      return this.buffer.push(INDENT);
    };

    ScriptBuilder.prototype.outdent = function() {
      return this.buffer.push(OUTDENT);
    };

    ScriptBuilder.prototype.capture = function(fn) {
      var buffer, result;
      if (typeof fn !== 'function') {
        return fn;
      }
      buffer = this.buffer;
      this.buffer = [];
      fn();
      result = this.toString();
      this.buffer = buffer;
      return result;
    };

    ScriptBuilder.prototype.toString = function() {
      var chunk, indent, line, result, _i, _j, _len, _len1, _ref, _ref1;
      indent = 0;
      result = [];
      _ref = this.buffer;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        chunk = _ref[_i];
        if (chunk === INDENT) {
          indent++;
        } else if (chunk === OUTDENT) {
          indent--;
        } else {
          _ref1 = chunk.split('\n');
          for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
            line = _ref1[_j];
            if (/^\s*$/.test(line)) {
              result.push(line);
            } else {
              result.push((new Array(indent + 1)).join('  ') + line);
            }
          }
        }
      }
      return result.join('\n');
    };

    return ScriptBuilder;

  })();

  Unique = (function() {

    function Unique(prefix) {
      this.prefix = prefix;
      this.index = 1;
    }

    Unique.prototype.next = function() {
      return "__" + this.prefix + (this.index++) + "__";
    };

    return Unique;

  })();

  root.ScriptBuilder = ScriptBuilder;

})();
(function() {
  "use strict";

  var JavaScriptBuilder, ScriptBuilder,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  ScriptBuilder = root.ScriptBuilder;

  JavaScriptBuilder = (function(_super) {

    __extends(JavaScriptBuilder, _super);

    function JavaScriptBuilder() {
      return JavaScriptBuilder.__super__.constructor.apply(this, arguments);
    }

    JavaScriptBuilder.prototype.eol = ';';

    JavaScriptBuilder.prototype["var"] = function(lhs, rhs) {
      return this.line("var " + (this.capture(lhs)) + " = " + (this.capture(rhs)));
    };

    JavaScriptBuilder.prototype._functionHeader = function(args) {
      return "function(" + (args.join(', ')) + ") {";
    };

    JavaScriptBuilder.prototype._functionTail = function() {
      return '}';
    };

    return JavaScriptBuilder;

  })(ScriptBuilder);

  root.JavaScriptBuilder = JavaScriptBuilder;

})();
(function() {
  "use strict";

  var AbstractCompiler, CoffeeScriptBuilder, CompileError, JavaScriptBuilder,
    __hasProp = {}.hasOwnProperty,
    __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  JavaScriptBuilder = root.JavaScriptBuilder;

  AbstractCompiler = (function() {

    function AbstractCompiler(compiler, options) {
      var name, _ref, _ref1;
      this.compiler = compiler;
      this.exports = compiler.exports;
      this.exportAs = compiler.exportAs;
      this.imports = compiler.imports;
      this.importAs = compiler.importAs;
      this.moduleName = compiler.moduleName;
      this.lines = compiler.lines;
      this.options = options;
      this.dependencyNames = [];
      _ref = this.imports;
      for (name in _ref) {
        if (!__hasProp.call(_ref, name)) continue;
        if (__indexOf.call(this.dependencyNames, name) < 0) {
          this.dependencyNames.push(name);
        }
      }
      _ref1 = this.importAs;
      for (name in _ref1) {
        if (!__hasProp.call(_ref1, name)) continue;
        if (__indexOf.call(this.dependencyNames, name) < 0) {
          this.dependencyNames.push(name);
        }
      }
      this.assertValid();
    }

    AbstractCompiler.prototype.assertValid = function() {
      if (this.exportAs && this.exports.length > 0) {
        throw new Error("You cannot use both `export =` and `export` in the same module");
      }
    };

    AbstractCompiler.prototype.buildPreamble = function(names) {
      var args, preamble,
        _this = this;
      args = [];
      preamble = this.build(function(s) {
        var dependency, deps, name, number, _i, _len, _results;
        number = 0;
        deps = s.unique('dependency');
        _results = [];
        for (_i = 0, _len = names.length; _i < _len; _i++) {
          name = names[_i];
          if (name in _this.importAs) {
            _results.push(args.push(_this.importAs[name]));
          } else {
            dependency = deps.next();
            args.push(dependency);
            _results.push(_this.buildImportsForPreamble(s, _this.imports[name], dependency));
          }
        }
        return _results;
      });
      return [args, preamble];
    };

    AbstractCompiler.prototype.build = function(fn) {
      var builder = new JavaScriptBuilder();

      fn(builder);
      return builder.toString();
    };

    AbstractCompiler.prototype.buildImportsForPreamble = function(builder, imports_, dependencyName) {
      var import_, _i, _len, _results;
      _results = [];
      for (_i = 0, _len = imports_.length; _i < _len; _i++) {
        import_ = imports_[_i];
        _results.push(builder.set(import_, function() {
          return builder.prop(dependencyName, import_);
        }));
      }
      return _results;
    };

    return AbstractCompiler;

  })();

  root.AbstractCompiler = AbstractCompiler;

})();
(function() {
  "use strict";

  var AMDCompiler, AbstractCompiler,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  AbstractCompiler = root.AbstractCompiler;

  AMDCompiler = (function(_super) {

    __extends(AMDCompiler, _super);

    function AMDCompiler() {
      return AMDCompiler.__super__.constructor.apply(this, arguments);
    }

    AMDCompiler.prototype.stringify = function() {
      var _this = this;
      return this.build(function(s) {
        var preamble, wrapperArgs, _ref;
        _ref = _this.buildPreamble(_this.dependencyNames), wrapperArgs = _ref[0], preamble = _ref[1];
        if (_this.exports.length !== 0) {
          _this.dependencyNames.push('exports');
          wrapperArgs.push('__exports__');
        }
        return s.line(function() {
          return s.call('define', function(arg) {
            if (_this.moduleName) {
              arg(s.print(_this.moduleName));
            }
            arg(s["break"]);
            arg(s.print(_this.dependencyNames));
            arg(s["break"]);
            return arg(function() {
              return s["function"](wrapperArgs, function() {
                var export_, _i, _len, _ref1;
                if (preamble) {
                  s.append(preamble);
                }
                s.append.apply(s, _this.lines);
                _ref1 = _this.exports;
                for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
                  export_ = _ref1[_i];
                  s.line("__exports__." + export_ + " = " + export_);
                }
                if (_this.exportAs) {
                  return s.line("return " + _this.exportAs);
                }
              });
            });
          });
        });
      });
    };

    return AMDCompiler;

  })(AbstractCompiler);

  root.AMDCompiler = AMDCompiler;

})();
(function() {
  "use strict";

  var AMDCompiler, Compiler, EXPORT, EXPORT_AS, IMPORT, IMPORT_AS,
    __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  AMDCompiler = root.AMDCompiler;// require("./amd_compiler");

  EXPORT = /^\s*export\s+(.*?)\s*(;)?\s*$/;
  EXPORT_AS = /^\s*export\s*=\s*(.*?)\s*(;)?\s*$/;
  IMPORT = /^\s*import\s+(.*)\s+from\s+(?:"([^"]+?)"|'([^']+?)')\s*(;)?\s*$/;
  IMPORT_AS = /^\s*import\s+(?:"([^"]+?)"|'([^']+?)')\s*as\s+(.*?)\s*(;)?\s*$/;

  Compiler = (function() {

    function Compiler(string, moduleName, options) {
      if (moduleName == null) {
        moduleName = null;
      }
      if (options == null) {
        options = {};
      }
      this.string = string;
      this.moduleName = moduleName;
      this.options = options;
      this.imports = {};
      this.importAs = {};
      this.exports = [];
      this.exportAs = null;
      this.lines = [];
      this.parse();
    }

    Compiler.prototype.parse = function() {
      var line, _i, _len, _ref;
      _ref = this.string.split('\n');
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        line = _ref[_i];
        this.parseLine(line);
      }
      return null;
    };

    Compiler.prototype.parseLine = function(line) {
      var match;
      if (match = this.matchLine(line, EXPORT_AS)) {
        return this.processExportAs(match);
      } else if (match = this.matchLine(line, EXPORT)) {
        return this.processExport(match);
      } else if (match = this.matchLine(line, IMPORT_AS)) {
        return this.processImportAs(match);
      } else if (match = this.matchLine(line, IMPORT)) {
        return this.processImport(match);
      } else {
        return this.processLine(line);
      }
    };

    Compiler.prototype.matchLine = function(line, pattern) {
      var match;
      match = line.match(pattern);
      if (match && !this.options.coffee && !match[match.length - 1]) {
        return null;
      }
      return match;
    };

    Compiler.prototype.processExportAs = function(match) {
      return this.exportAs = match[1];
    };

    Compiler.prototype.processExport = function(match) {
      var ex, exports, _i, _len, _ref, _results;
      exports = match[1];
      if (exports[0] === '{' && exports[exports.length - 1] === '}') {
        exports = exports.slice(1, -1);
      }
      _ref = exports.split(/\s*,\s*/);
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        ex = _ref[_i];
        ex = ex.trim();
        if (__indexOf.call(this.exports, ex) < 0) {
          _results.push(this.exports.push(ex));
        } else {
          _results.push(void 0);
        }
      }
      return _results;
    };

    Compiler.prototype.processImportAs = function(match) {
      return this.importAs[match[1] || match[2]] = match[3];
    };

    Compiler.prototype.processImport = function(match) {
      var importNames, name, pattern;
      pattern = match[1];
      if (pattern[0] === '{' && pattern[pattern.length - 1] === '}') {
        pattern = pattern.slice(1, -1);
      }
      importNames = (function() {
        var _i, _len, _ref, _results;
        _ref = pattern.split(/\s*,\s*/);
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          name = _ref[_i];
          _results.push(name.trim());
        }
        return _results;
      })();
      return this.imports[match[2] || match[3]] = importNames;
    };

    Compiler.prototype.processLine = function(line) {
      return this.lines.push(line);
    };

    Compiler.prototype.toAMD = function() {
      return new AMDCompiler(this, this.options).stringify();
    };

    return Compiler;

  })();

  root.Compiler = Compiler;

})();
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
})();/*
 * es6-module-loader
 * https://github.com/addyosmani/es6-module-loader
 *
 * Copyright (c) 2012 Luke Hogan, Addy Osmani
 * Licensed under the MIT license.
 */

(function (global) {


  // new Loader( parent [, options ] ) - Module loader constructor
  // The Loader constructor creates a new loader. The first argument is the
  // parent loader. The second is an options object
  //
  // options.global - The loader's global object
  // options.baseURL - The loader's base URL
  // options.linkedTo - The source of the loader's intrinsics (not impl)
  // options.strict -  should code evaluated in the loader be in strict mode?
  // options.resolve( relURL, baseURL ) - The URL resolution hook
  // options.fetch( relURL, baseURL, request, resolved ) - The module loading hook
  // options.translate( src, relURL, baseURL, resolved ) - source translation hook
  function Loader(parent, options) {

    // Initialization of loader state from options
    this._global = options.global || Object.create(null);
    this._baseURL = options.baseURL || this.global && this.global.baseURL;
    if (options.linkedTo === null || options.linkedTo) {
      throw new Error("Setting 'linkedTo' not yet supported.");
    }
    this._strict = options.string === undefined ? false : !! options.string;
    this._resolve = options.resolve || parent.resolve;
    this._fetch = options.fetch || parent.fetch;
    this._translate = options.translate || parent.translate;

    // The internal table of module instance objects
    this._mios = {};
  }


  Object.defineProperty(Loader.prototype, "global", {
    configurable: true,
    enumerable: true,
    get: function () {
      return this._global;
    }
  });

  Object.defineProperty(Loader.prototype, "baseURL", {
    configurable: true,
    enumerable: true,
    get: function () {
      return this._baseURL;
    }
  });


  // Loader.prototype.load( url, callback, errback )
  //
  // The load method takes a string representing a module URL and a
  // callback that receives the result of loading, compiling, and
  // executing the module at that URL. The compiled code is statically
  // associated with this loader, and its URL is the given URL. The
  // additional callback is used if an error occurs.
  Loader.prototype.load = function (url, callback, errback) {
    var key = this._resolve(url, this._baseURL);
    if (this._mios[key]) {
      callback(this._mios[key]);
    } else {
      var self = this;
      this._fetch(url, this._baseURL, {
        fulfill: function (src) {

          var actualSrc, evalSrc;

          actualSrc = self._translate(src, url, self._baseURL, key);
          if (self._strict) {
            actualSrc = "'use strict';\n" + actualSrc;
          }

          //evalSrc = eval(actualSrc);
          evalSrc = compile(actualSrc, url, self._baseURL);
          self.set(url, evalSrc);
          callback(self._mios[key]);
        },
        redirect: function (url, baseURL) {
          throw new Error("'redirect' not yet implemented");
        },
        reject: function (msg) {
          errback(msg);
        }
      }, key);
    }
  };

  // Loader.prototype.eval( src )
  // The eval method takes a string representing a Program and returns
  // the result of compiling and executing the program.
  Loader.prototype.eval = function (sourceText) {
    with(this._global) {
      eval(sourceText);
    }
  };


  // Loader.prototype.evalAsync( src, callback, errback )
  //
  // The evalAsync method takes a string representing a Program and a
  // callback that receives the result of compiling and executing the
  // program. The compiled code is statically associated with this loader,
  // and its URL is the base URL of this loader. The additional callback
  // is used if an error occurs.

  Loader.prototype.evalAsync = function () {
    throw new Error("'evalAsync' is not yet implemented. Its not required until module syntax is natively available.");
  };


  // Loader.prototype.get( url )
  //
  // The get method looks up a module in the loader's module instance table.
  // The URL is resolved to a key by calling the loader's resolve operation.
  Loader.prototype.get = function (url) {
    var key = this._resolve(url, this._baseURL);
    return this._mios[key];
  };


  // Loader.prototype.set( urlOrMods[, mod ] )
  //
  // The set method stores a module or set of modules in the loader's
  // module instance table. Each URL is resolved to a key by calling
  // the loader's resolve operation.
  Loader.prototype.set = function (url, mio) {
    var key = this._resolve(url, this._baseURL);
    if (typeof url === "string") {
      this._mios[key] = Module(mio);
    } else {
      for (var p in key) {
        this._mios[p] = Module(key[p]);
      }
    }
  };

  // Loader.prototype.defineBuiltins( [ obj ] )
  //
  // The defineBuiltins method takes an object and defines all the built-in
  // objects and functions of the ES6 standard library associated with this
  // loader's intrinsics as properties on the object.
  Loader.prototype.defineBuiltins = function (o) {
    if (typeof o != "object") throw new Error("Expected object");
    for (var globalProp in global) {
      o[globalProp] = global;
    }
    return o;
  };


  function Module(o) {

    if (o === null) throw new TypeError("Expected object");
    var obj = Object(o);
    if (obj instanceof Module) {
      return obj;
    } else {

      var mio = Object.create(null);

      for (var key in obj) {
        (function (key) {
          Object.defineProperty(mio, key, {
            configurable: false,
            enumerable: true,
            get: function () {
              return obj[key];
            }
          });
        })(key);
      }

      return mio;
    }
  };


  // Pre-configured Loader instance for easier use
  var defaultSystemLoader = new Loader(null, {
    global: window,
    baseURL: document.URL.substring(0, document.URL.lastIndexOf('\/') + 1),
    strict: false,
    resolve: function (relURL, baseURL) {
      var url = baseURL + relURL;
      return url;
    },
    fetch: function (relURL, baseURL, request, resolved) {
      var url = baseURL + relURL;
      var xhr = new XMLHttpRequest();
      xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
          if (xhr.status === 200) {
            request.fulfill(xhr.responseText);
          } else {
            request.reject(xhr.statusText);
          }
        }
      };
      xhr.open("GET", url, true);
      xhr.send(null);
    },
    translate: function (src, relURL, baseURL, resolved) {
      return src;
    }
  });
  
  var compile = function(src, name, baseURL) {
    var cc = new root.Compiler(src, name);
    var str = cc.toAMD();
    str += "\nreturn require('" + name +"');"
    // add sourceURL so these are treated as script files in a debugger
    str += '\n//@ sourceURL=' + baseURL + name;
    
    var func = new Function('define', 'require', str);
    return func.apply(null, [define, require]);
  };

  // Export the Loader class
  global.Loader = Loader;
  // Export the Module class
  global.Module = Module;
  // Export the System object
  global.System = defaultSystemLoader;


})(window);

})();