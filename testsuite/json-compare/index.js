/* global  require, exports, module, console */

var _ = require('lodash');
var colors = require("colors");
var log = console.log;
var read = require('fs').readFileSync;

var differentValues = [];
var missingKeys = [];

function serializeObject(obj) {
    if (_.isString(obj)) {
        obj = JSON.parse(read(obj));
    }

    var res = {};
    function recurse(context, obj) {
        _.forIn(obj, function(value, key) {
            var nkey = context + key;
            if (_.isObject(value)) {
                recurse(nkey + '.', value);
            } else if (_.isArray(value)) {
                res[nkey] = JSON.stringify(value);
            } else {
                res[nkey] = value;
            }
        });
    }

    recurse('', obj);
    return res;
}

function compareSerializedValue(obj1, obj2) {
    var res = [];
    _.forIn(obj1, function(value, key) {
        var otherVal = obj2[key];
        if (!_.isUndefined(otherVal) && otherVal !== value) {
            res.push({
                'key': key,
                'expected': value,
                'value': otherVal
            });
        }
    });
    return res;
}

function getMissingKeysFromSerialized(obj1, obj2) {
    return _.xor(_.keys(obj1), _.keys(obj2));
}

exports.compareValues = function(obj1, obj2) {
    return compareSerializedValue(serializeObject(obj1), serializeObject(obj2));
};

exports.getMissingKeysFromSerialized = function(obj1, obj2) {
    return compareSerializedValue(serializeObject(obj1), serializeObject(obj2));
};

exports.isEqual = function(o1, o2) {
    var obj1 = serializeObject(o1);
    var obj2 = serializeObject(o2);

    var differentValues = compareSerializedValue(obj1, obj2);
    var missingKeys = getMissingKeysFromSerialized(obj1, obj2);

    return (_.isEmpty(missingKeys) && _.isEmpty(differentValues));
};

exports.writeReport = function(o1, o2) {
    var obj1 = serializeObject(o1);
    var obj2 = serializeObject(o2);

    var missingKeys = getMissingKeysFromSerialized(obj1, obj2);
    if (_.isEmpty(missingKeys)) {
        log('Missing keys: '.cyan + 'None'.green);
    } else {
        log('Missing keys: '.cyan + 'Failed'.bold.red);
        missingKeys.forEach(function(keyname) {
            log('\t- ' + keyname);
        });
    }

    var differentValues = compareSerializedValue(obj1, obj2);
    if (_.isEmpty(differentValues)) {
        log('Keys with different values: '.cyan + 'None'.green);
    } else {
        log('Keys with different values: '.cyan + 'Failed'.red);
        differentValues.forEach(function(v) {
            log(' - ' + v.key.bold);
            log(' \t expected: ' + v.expected);
            log(' \t value: ' + v.value);
        });
    }
};
