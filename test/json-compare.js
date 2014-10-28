var _ = require('lodash');
var read = require('fs').readFileSync;

var differentValues = [];
var missingKeys = [];

function serializeObject(obj) {
    if (_.isString(obj)) {
        obj = JSON.parse(read(obj, 'utf8'));
    }
    return flatten(obj);
}

function flatten(obj) {
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

exports.flatten = serializeObject;

exports.compareValues = function(obj1, obj2) {
    return compareSerializedValue(serializeObject(obj1), serializeObject(obj2));
};

exports.getMissingKeys = function(obj1, obj2) {
    return getMissingKeysFromSerialized(serializeObject(obj1), serializeObject(obj2));
};
