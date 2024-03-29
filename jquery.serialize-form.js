(function () {
    var originalSerializeArray = $.fn.serializeArray;
    $.fn.extend({
        serializeArray: function () {
            var brokenSerialization = originalSerializeArray.apply(this);
            var checkboxValues = $(this).find('input[type=checkbox]').map(function () {
                return {'name': this.name, 'value': this.checked};
            }).get();
            var selectValues = $(this).find('select[multiple]').map(function () {
                return this.value ? null : {'name': this.name};
            }).get();
            var checkboxKeys = $.map(checkboxValues, function (element) {
                return element.name;
            });
            var withoutCheckboxes = $.grep(brokenSerialization, function (element) {
                return $.inArray(element.name, checkboxKeys) == -1;
            });
            //console.log(selectValues);
            return $.merge(withoutCheckboxes, $.merge(checkboxValues, selectValues));
        },
        jsonToForm: function (data, callbacks) {
            var formInstance = this;
            var options = {
                data: data || null,
                callbacks: callbacks
            };
            if (options.data != null) {
                $.each(options.data, function (k, v) {
                    if (options.callbacks != null && options.callbacks.hasOwnProperty(k)) {
                        options.callbacks[k](v);
                    } else {
                        var t = $('[name="' + k + '"]', formInstance);
                        if (t.is('input')) {
                            if (t.is('[type=text]') || t.is('[type=number]') || t.is('[type=hidden]')) {
                                t.val(v);
                            } else if (t.is('[type=checkbox]')) {
                                var vs = v.toString();
                                t.prop('checked', vs === 'true' || vs === '1');
                            }
                        } else if (t.is('select')) {
                            t.val(v.toString());
                        } else {
                            t.text(v);
                        }
                    }
                });
            }
        }
    });
})();

(function (root, factory) {
    // AMD
    if (typeof define === "function" && define.amd) {
        define(["exports", "jquery"], function (exports, $) {
            return factory(exports, $);
        });
    }
    // CommonJS
    else if (typeof exports !== "undefined") {
        var $ = require("jquery");
        factory(exports, $);
    }
    // Browser
    else {
        factory(root, (root.jQuery || root.Zepto || root.ender || root.$));
    }
}(this, function (exports, $) {
    var patterns = {
        validate: /^[a-z_][a-z0-9_]*(?:\[(?:\d*|[a-z0-9_]+)\])*$/i,
        key: /[a-z0-9_]+|(?=\[\])/gi,
        push: /^$/,
        fixed: /^\d+$/,
        named: /^[a-z0-9_]+$/i
    };

    function FormSerializer(helper, $form) {
        // private variables
        var data = {};
        var pushes = {};

        // private API
        function build(base, key, value) {
            base[key] = value;
            return base;
        }

        function makeObject(root, value) {
            var keys = root.match(patterns.key), k;
            // nest, nest, ..., nest
            while ((k = keys.pop()) !== undefined) {
                // foo[]
                if (patterns.push.test(k)) {
                    var idx = incrementPush(root.replace(/\[\]$/, ''));
                    value = build([], idx, value);
                }
                // foo[n]
                else if (patterns.fixed.test(k)) {
                    value = build([], k, value);
                }
                // foo; foo[bar]
                else if (patterns.named.test(k)) {
                    value = build({}, k, value);
                }
            }
            return value;
        }

        function incrementPush(key) {
            if (pushes[key] === undefined) {
                pushes[key] = 0;
            }
            return pushes[key]++;
        }

        function encode(pair) {
            switch ($('[name="' + pair.name + '"]', $form).attr("type")) {
                case "checkbox":
                    return pair.value === "on" ? true : pair.value;
                default:
                    return pair.value;
            }
        }

        function addPair(pair) {
            if (!patterns.validate.test(pair.name)) return this;
            var obj = makeObject(pair.name, encode(pair));
            data = helper.extend(true, data, obj);
            return this;
        }

        function addPairs(pairs) {
            if (!helper.isArray(pairs)) {
                throw new Error("formSerializer.addPairs expects an Array");
            }
            for (var i = 0, len = pairs.length; i < len; i++) {
                this.addPair(pairs[i]);
            }
            return this;
        }

        function serialize() {
            return data;
        }

        function serializeJSON() {
            return JSON.stringify(serialize());
        }

        // public API
        this.addPair = addPair;
        this.addPairs = addPairs;
        this.serialize = serialize;
        this.serializeJSON = serializeJSON;
    }

    FormSerializer.patterns = patterns;
    FormSerializer.serializeObject = function serializeObject() {
        return new FormSerializer($, this).addPairs(this.serializeArray()).serialize();
    };
    FormSerializer.serializeJSON = function serializeJSON() {
        return new FormSerializer($, this).addPairs(this.serializeArray()).serializeJSON();
    };
    if (typeof $.fn !== "undefined") {
        $.fn.serializeObject = FormSerializer.serializeObject;
        $.fn.serializeJSON = FormSerializer.serializeJSON;
    }
    exports.FormSerializer = FormSerializer;
    return FormSerializer;
}));
