(function() {
  var JavaScriptBuilder, ScriptBuilder,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  ScriptBuilder = root.ScriptBuilder;

  JavaScriptBuilder = (function(_super) {

    function JavaScriptBuilder() {
      return JavaScriptBuilder.__super__.constructor.apply(this, arguments);
    }

    __extends(JavaScriptBuilder, _super);

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
