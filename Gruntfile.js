/**
 *
 * ©2018-2019 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */

module.exports = function GruntConfig(grunt) {
  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    mochaTest: {
      options: {
        mochaOptions: ['--exit']
      },
      test: {
        options: {
          quiet: false,
          clearRequireCache: true,
          timeout: 100000
        },
        src: ['test/test.js']
      }
    },

    clean: {
      coverage: {
        src: ['coverage/']
      },
      dist: {
        src: ['dist/']
      }
    },

    mocha_istanbul: {
      coverage: {
        src: 'test/test.js',
        options: {
          timeout: 60000,
          check: {
            lines: 80,
            statements: 80,
            branches: 60,
            functions: 75
          },
          reportFormats: ['lcov']
        }
      }
    }
  });

  // Add the grunt-mocha-test tasks.
  grunt.loadNpmTasks('grunt-mocha-test');
  grunt.loadNpmTasks('grunt-mocha-istanbul');
  grunt.loadNpmTasks('grunt-contrib-clean');

  grunt.loadNpmTasks('grunt-mkdir');
  grunt.loadNpmTasks('grunt-contrib-copy');

  grunt.registerTask('test-with-coverage', ['clean:coverage', 'mocha_istanbul']);
};
