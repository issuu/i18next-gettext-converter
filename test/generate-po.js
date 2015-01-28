/* globals describe, it, before */
/* jshint expr:true */
var _ = require('lodash');
var Gettext = require('node-gettext');
var expect = require('chai').expect;
var converter = require('../index');
var compare = require('./json-compare');
var fs = require('fs');
var path = require('path');

function read(lang, filepath) {
    var gt = new Gettext();
    var body = fs.readFileSync(filepath);
    console.log(body);
    gt.addTextdomain(lang, body);
    return gt.domains[gt._currentDomain].translations;
}

describe('Create .po file from .json', function() {
    var pathToSrc = path.join(__dirname, '../testfiles/__lang__/translation.json');
    var pathToReference = path.join(__dirname, '../testfiles/__lang__/translation.po');
    var pathToTarget = path.join(__dirname, '../tmp/translation-__lang__.po');

    function testForLang(lang) {
        describe('Test for lang: ' + lang, function() {
            var src = pathToSrc.replace('__lang__', lang);
            var target = pathToTarget.replace('__lang__', lang);
            var targetObj;
            var reference = pathToReference.replace('__lang__', lang);
            var referenceObj;
            var options = {};

            before(function(done) {
                converter().process(lang, src, target, options, function(err) {
                    if (err) {
                        console.log('failed to convert file, err: ' + JSON.stringify(err));
                    }
                    targetObj = read(lang, target);
                    referenceObj = read(lang, reference);

                    done();
                });
            });

            it('should have the same keys', function() {
                var diff = compare.getMissingKeys(targetObj, referenceObj);
                expect(diff, JSON.stringify(diff)).to.be.empty;
            });

            it('should have all the key equal', function() {
                var generatedObj = compare.flatten(targetObj);
                var refObj = compare.flatten(referenceObj);

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
