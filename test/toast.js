import 'jquery-1.9.0.js' as $;

function Toast() {
  this.jam = 'grape';
}

Toast.prototype.$ = $;

export = Toast;