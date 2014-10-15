/* global  require, exports, module, console */
var compare = require('./json-compare/index');
var converter = require("../lib/gettextWrapper");
var path = require('path');
require('colors');

function convert(lang, src, target, onDone) {
    converter.process(lang, path.relative('.', src), path.relative('.', target), {
        keyseparator: '.',
        quiet: true
    }, function(err) {
        if (err) {
            console.log(('failed writing file: ' + target).red);
        } else {
            var a = (onDone) ? onDone() : undefined;
        }
    });
}

function test(src, lang, onDone) {
    var dirname = path.dirname(src).replace(/\//, '-') + '-';
    var filename  = path.basename(src, '.json');
    var srcJson = path.resolve(path.join('../testfiles/', src));
    var targetPo = path.resolve(path.join('../tmp', dirname + filename + '-' + lang + '.po'));
    var targetJson = path.resolve(path.join('../tmp', dirname + filename + '-' + lang + '.json'));

    console.log(('\nCompare on ' + lang.red + ' transformation').underline);
    convert(lang, srcJson, targetPo, function() {
        convert(lang, targetPo, targetJson, function() {
            compare.writeReport(srcJson, targetJson);
            var a = (onDone) ? onDone() : undefined;
        });
    });
}

var languageList = ['en', 'de', 'fr', 'it', 'es', 'pt', 'ch', 'jp'];
var testfile = 'issuu/lang.json';
var testfile = 'de/source.de.json';

function recurseLng() {
    var lng = languageList.pop();
    if (lng) {
        test(testfile, lng, recurseLng);
    }
}

recurseLng();
