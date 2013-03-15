module.exports = function(grunt) {
  var outFile = 'build/es6modulesnow.js',
      minFile = 'build/es6modulesnow.min.js';

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

  grunt.initConfig({
    concat: {
      dist: {
        src: files.map(function(f) { return 'src/' + f }),
        dest: outFile
      }
    },
    uglify: {
      dist: {
        files: {
          'build/es6modulesnow.min.js': outFile
        }
      }
    },
    jshint: {
      files: ['Gruntfile.js', 'src/**/*.js'],
        options: {
          es5: true,
          eqnull: true,
          laxbreak: true,
          globals: {
          }
        }
    }
  });
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.registerTask('lint', ['jshint']);
  grunt.registerTask('build', ['concat', 'uglify']);
  grunt.registerTask('default', ['jshint', 'concat', 'uglify']);
};
