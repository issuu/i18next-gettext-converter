/* globals describe, it, before */
/* jshint expr:true */
var _ = require('lodash');
var expect = require('chai').expect;
var converter = require('../index');
var compare = require('./json-compare');
var path = require('path');

describe('Create .json from .po', function() {
    var pathToSrc = path.join(__dirname, '../testfiles/__lang__/translation.po');
    var pathToReference = path.join(__dirname, '../testfiles/__lang__/translation.json');
    var pathToTarget = path.join(__dirname, '../tmp/translation-__lang__.json');

    function testForLang(lang) {
        describe('test for lang: ' + lang, function() {
            var src = pathToSrc.replace('__lang__', lang);
            var target = pathToTarget.replace('__lang__', lang);
            var reference = pathToReference.replace('__lang__', lang);
            var options = {};

            before(function(done) {
                converter().process(lang, src, target, options, function(err) {
                    if (err) {
                        console.log('failed to convert file, err: ' + JSON.stringify(err));
                    }
                    done();
                });
            });
            it('should have the same keys', function() {
                var diff = compare.getMissingKeys(target, reference);
                expect(diff, JSON.stringify(diff)).to.be.empty;
            });

            it('should have all the key equal', function() {
                var generatedObj = compare.flatten(target);
                var refObj = compare.flatten(reference);

                _.forIn(generatedObj, function(value, key) {
                    expect(value, 'for key: ' + key).to.be.equal(refObj[key]);
                });
            });

        });

    }

    testForLang('en');
    testForLang('de');
    testForLang('ru');
    testForLang('et');
});
