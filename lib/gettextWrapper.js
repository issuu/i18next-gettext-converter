/* jshint node:true */
// inspiration to fix the plural problem
// https://github.com/ganchenkor/i18next-gettext-converter/commit/230887e3c118d7fa33403342dd19d783e2b3565b

'use strict';

var Gettext = require('node-gettext'),
    GettextParser = require('gettext-parser'),
    plurals = require('./plurals'),
    flatten = require('./flatten'),
    fs = require('fs'),
    path = require('path'),
    colors = require('colors'),
    util = require('util');

function consolidateOptions(opts, defaultsVal) {
    var options = opts || {};
    if (!options.keyseparator) {
        options.keyseparator = defaultsVal.keyseparator;
    }
    if (typeof options.contextseparator !== 'string') {
        options.contextseparator = defaultsVal.contextseparator;
    }
    if (typeof options.quiet !== 'boolean') {
        options.quiet = defaultsVal.quiet;
    }
    if (typeof options.metadataprefix !== 'string') {
        options.metadataprefix = defaultsVal.metadataprefix;
    }

    return options;
}

function consolidateTarget(domain, source, target, defaultExt) {
    var dirname = path.dirname(source),
        ext = path.extname(source),
        filename = path.basename(source, ext);

    if (!target) {
        if (dirname.indexOf(domain) === dirname.length - domain.length) {
            target = path.join(dirname, filename + '.po');
        } else {
            target = path.join(dirname, domain, filename + '.po');
        }
    }
    return target;
}

module.exports = function() {
    var gt = new Gettext();

    return {
        options: {
            keyseparator: '##',
            contextseparator: '_',
            metadataprefix: '//',
            quiet: true
        },

        process: function(domain, source, target, options, callback) {
            var ext = path.extname(source);

            if (ext === '.mo' || ext === '.po') {
                return this.gettextToI18next(domain, source, target, options, callback);
            }

            if (ext === '.json') {
                return this.i18nextToGettext(domain, source, target, options, callback);
            }
        },

        jsonToPo: function(domain, source, options) {
            var gt = this.toGettext(domain, source, options);
            return GettextParser.po.compile(gt.domains[domain]);
        },

        poToJson: function(domain, source, options) {
            if (!(source instanceof Buffer)) {
                source = new Buffer(source);
            }
            var data = this.addTextDomain(domain, source, options);
            return this.parseJSON(domain, data, options);
        },

        /***************************
         *
         * I18NEXT JSON --> GETTEXT
         *
         ***************************/
        i18nextToGettext: function(domain, source, target, options, callback) {
            var self = this;
            if (typeof options === 'function') {
                callback = options;
                options = {};
            }
            self.readFile(source, options, function(err, body) {
                if (err) {
                    callback(err);
                    return;
                }

                // about writing the file
                target = consolidateTarget(domain, source, target, '.po');

                var gt = self.toGettext(domain, JSON.parse(body), options);

                var data = '';
                switch (path.extname(target)) {
                    case '.po':
                        data = GettextParser.po.compile(gt.domains[domain]);
                        break;
                    case '.mo':
                        data = GettextParser.mo.compile(gt.domains[domain]);
                        break;
                    default:
                        console.log('invalid output format'.red);
                }
                self.writeFile(target, data, options, callback);
            });
        },

        /* i18next json --> gettext
         *
         */

        toGettext: function(domain, jsonObj, options) {
            options = consolidateOptions(options, this.options);
            var flat = flatten.flatten(jsonObj, options);
            return this.parseGettext(domain, flat, options);
        },

        /* flat json --> gettext
         *
         */
        parseGettext: function(domain, data, options) {
            options = consolidateOptions(options, this.options);
            gt.addTextdomain(domain, 'msgid ""' + 'msgstr ""' +
                '"Project-Id-Version: node-gettext\n"' +
                '"MIME-Version: 1.0\n"' +
                '"Content-Type: text/plain; charset=UTF-8\n"' +
                '"Content-Transfer-Encoding: 8bit\n"' +
                '"Plural-Forms: \n"');

            var ext = plurals.rules[domain.split('-')[0]];

            if (!options.quiet) {
                console.log('\n    <-> parsing data to gettext format'.cyan);
            }

            var setTranslation = function (domain, context, key, value) {
                var o = { msgid: key, msgctxt: context, msgstr: value };
                if (Array.isArray(value)) {
                    o['msgid_plural'] = key;
                }
                if (!gt.domains[domain].translations[context]) {
                    gt.domains[domain].translations[context] = {};
                }
                gt.domains[domain].translations[context][key] = o;
            };

            for (var m in data) {
                var kv = data[m];

                if (kv.plurals) {
                    var pArray = [];
                    //                pArray.splice(this.getGettextPluralPosition(ext, '-1'), 0, kv.value);
                    pArray.splice(this.getGettextPluralPosition(ext, '0'), 0, kv.value);
                    for (var i = 0, len = kv.plurals.length; i < len; i++) {
                        var plural = kv.plurals[i];
                        pArray.splice(this.getGettextPluralPosition(ext, plural.pluralNumber), 0, plural.value);
                        setTranslation(domain, kv.context, kv.key, pArray);
                    }
                } else {
                    setTranslation(domain, kv.context, kv.key, kv.value);
                }

                if (kv.metadata) {
                    var comment = {};
                    for (var commentKey in kv.metadata) {
                        if (util.isArray(kv.metadata[commentKey])) {
                            comment[commentKey] = kv.metadata[commentKey].join('\n').replace(/^\n/, '');
                        } else {
                            comment[commentKey] = kv.metadata[commentKey];
                        }
                    }
                    gt.domains[domain].translations[kv.context][kv.key].comments = comment;
                }
            }
            return gt;
        },

        /* helper to get plural suffix
         *
         */
        getGettextPluralPosition: function(ext, suffix) {
            if (ext) {
                //                if (ext.numbers.length === 2) {
                //
                //                    if (suffix === '-1') { // singular
                //                        suffix = '1';
                //                    } else if (suffix === '1') { // regular plural
                //                        suffix = '2';
                //                    }
                //                    // germanic like en
                //                    if (ext.numbers[0] === 2) {
                //                        if (suffix === '-1') { // regular plural
                //                            suffix = '1';
                //                        } else if (suffix === '1') { // singular
                //                            suffix = '2';
                //                        }
                //                    }
                //                    // romanic like fr
                //                    else if (ext.numbers[0] === 1) {
                //                        if (suffix === '-1') { // regular plural
                //                            suffix = '2';
                //                        } else if (suffix === '1') { // singular
                //                            suffix = '1';
                //                        }
                //                    }
                //
                //                }

                for (var i = 0, len = ext.numbers.length; i < len; i++) {
                    if (ext.numbers[i].toString() === suffix) {
                        return i + 1;
                    }
                }
            }
            return -1;
        },

        /***************************
         *
         * GETTEXT --> I18NEXT JSON
         *
         ***************************/
        gettextToI18next: function(domain, source, target, options, callback) {
            var self = this;
            if (typeof options === 'function') {
                callback = options;
                options = {};
            }
            self.readFile(source, options, function(err, body) {
                if (err) {
                    callback(err);
                    return;
                }
                var data = self.addTextDomain(domain, body, options);
                var jsonTxt = self.parseJSON(domain, data, options);
                var jsonData = JSON.stringify(jsonTxt, null, 4);
                target = consolidateTarget(domain, source, target, '.json');
                self.writeFile(target, jsonData, options, callback);
            });
        },

        /* gettext --> barebone json
         *
         */
        addTextDomain: function(domain, body, options) {
            options = consolidateOptions(options, this.options);
            gt.addTextdomain(domain, body);

            var bareboneJson = gt.domains[gt._currentDomain].translations;

            return bareboneJson;
        },

        /* barebone json --> i18next json
         *
         */
        parseJSON: function(domain, data, options) {
            options = consolidateOptions(options, this.options);
            var separator = options.keyseparator;

            if (!options.quiet) {
                console.log('\n    <-> parsing data to i18next json format'.cyan);
            }
            var json = {};

            var toArrayIfNeeded = function(value) {
                var ret = value;
                if (ret.indexOf('\n') > -1) {
                    ret = ret.split('\n');
                }
                return ret;
            };

            for (var m in data) {
                var context = data[m];
                for (var key in context) {
                    if (!key) {
                        continue;
                    }
                    var appendTo = json,
                        targetKey = key;

                    if (key.indexOf(separator) > -1) {
                        var keys = key.split(separator);

                        var x = 0;
                        while (keys[x]) {
                            if (x < keys.length - 1) {
                                appendTo[keys[x]] = appendTo[keys[x]] || {};
                                appendTo = appendTo[keys[x]];
                            } else {
                                targetKey = keys[x];
                            }
                            x++;
                        }
                    }

                    var values = context[key];
                    if (m !== '') {
                        targetKey = targetKey + '_' + m;
                    }

                    if (!Array.isArray(values.msgstr)) {
                        appendTo[targetKey] = toArrayIfNeeded(values.msgstr);
                    } else {
                        var ext = plurals.rules[domain.split('-')[0]];
                        for (var i = 0, len = values.msgstr.length; i < len; i++) {
                            var pluralSuffix = this.getI18nextPluralExtension(ext, i);
                            var pkey = targetKey + pluralSuffix;
                            appendTo[pkey] = toArrayIfNeeded(values.msgstr[i]);
                        }
                    }

                    if (values.comments) {
                        var comments = {};
                        for (var commentsKey in values.comments) {
                            comments[commentsKey] = toArrayIfNeeded(values.comments[commentsKey]);
                        }
                        appendTo[options.metadataprefix + targetKey] = comments;
                    }
                }

            }
            return json;
        },

        /* helper to get plural suffix
         *
         */
        getI18nextPluralExtension: function(ext, i) {
            if (ext) {
                var number = ext.numbers[i];
                if (ext.numbers.length === 2) {
                    if (ext.numbers.length === 2) {
                        // germanic like en
                        if (ext.numbers[0] === 2) {
                            if (number === 2) {
                                number = 1; // singular
                            } else if (number === 1) {
                                number = -1; // regular plural
                            }
                        }
                        // romanic like fr
                        else if (ext.numbers[0] === 1) {
                            if (number === 2) {
                                number = -1; // regular plural
                            } else if (number === 1) {
                                number = 1; // singular
                            }
                        }
                    }
                    return number > 0 ? '' : '_plural';
                } else {
                    return number === 1 ? '' : '_plural_' + number; // suffix all but singular
                }
            } else {
                return i === 1 ? '' : '_plural';
            }
        },

        /***************************
         *
         * SHARED
         *
         ***************************/

        readFile: function(source, options, callback) {
            options = consolidateOptions(options, this.options);
            if (!options.quiet) {
                console.log(('\n    --> reading file from: ' + source));
            }

            fs.readFile(source, callback);
        },

        writeFile: function(target, data, options, callback) {
            options = consolidateOptions(options, this.options);
            if (!options.quiet) {
                console.log(('\n    <-- writting file to: ' + target));
            }

            var dir = path.dirname(target);
            if (!fs.statSync(dir)) {
                fs.mkdir(dir, function(err) {
                    if (err) {
                        callback(err);
                    } else {
                        fs.writeFile(target, data, callback);
                    }
                });
            } else {
                fs.writeFile(target, data, callback);
            }
        }
    };
};
