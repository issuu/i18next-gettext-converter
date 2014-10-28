module.exports = {
    flatten: function(input, options) {
        var flat = {},
            separator = options.keyseparator,
            contextseparator = options.contextseparator;

        var ctxtsepLength = contextseparator.length;

        function recurse(appendTo, obj, parentKey) {

            for (var m in obj) {
                var kv, value = obj[m],
                    key = parentKey,
                    context = '';

                if (key.length > 0) {
                    key = key + separator + m;
                } else {
                    key = m;
                }

                // get context if used
                var ctxKey = key;
                if (key.indexOf('_plural') > -1) {
                    ctxKey = ctxKey.replace(new RegExp('_plural_.*', 'g'), '');
                    ctxKey = ctxKey.replace(new RegExp('_plural', 'g'), '');
                }

                var msgId = ctxKey;
                if (ctxtsepLength) {
                    if (ctxKey.indexOf(contextseparator) > -1) {
                        //context = ctxKey.substring(ctxKey.lastIndexOf(contextseparator) + ctxtsepLength, ctxKey.length);
                        context = ctxKey.substring(ctxKey.indexOf(contextseparator) + ctxtsepLength, ctxKey.length);
                    }
                    if (context === key) {
                        context = '';
                    }
                    if (context) {
                        msgId = ctxKey.replace(contextseparator + context, '');
                    }
                }

                // append or recurse
                if (typeof value === 'string') {
                    kv = {
                        //id: key.replace(new RegExp(' ', 'g'), ''),
                        key: msgId,
                        value: value,
                        isPlural: key.indexOf('_plural') > -1,
                        context: context
                    };
                    appendTo[key] = kv;
                } else if (Object.prototype.toString.apply(value) === '[object Array]') {
                    kv = {
                        //id: key.replace(new RegExp(' ', 'g'), ''),
                        key: msgId,
                        value: value.join('\n'),
                        isArray: true,
                        isPlural: key.indexOf('_plural') > -1,
                        context: context
                    };
                    appendTo[key] = kv;
                } else {
                    recurse(appendTo, value, key);
                }
            }
        }
        recurse(flat, input, '');
        // append plurals
        for (var m in flat) {
            var kv = flat[m];

            if (kv.isPlural) {
                var parts = m.split('_plural');
                var context = kv.context;
                var idx = kv.key + ((context) ? contextseparator + context : '');
                var single = flat[idx];
                kv.pluralNumber = parts[1].replace('_', '');
                if (kv.pluralNumber === '') {
                    kv.pluralNumber = '1';
                }

                if (single) {
                    single.plurals = single.plurals || [];
                    single.plurals.push(kv);

                    delete flat[m];
                }
            }
        }
        return flat;
    }
};
