var fs = require('fs');
var x11 = require('x11');
var _ = require('lodash');

var dev = '/dev/hidraw0';
2
var rs = fs.createReadStream(dev);
var ws = fs.createWriteStream(dev);

var Exposure = x11.eventMask.Exposure;
var PointerMotion = x11.eventMask.PointerMotion;

var handlers = {};

var parseHex = function (hex) {
    return _.map(hex.split(/\s+/), function (octet) {
        return parseInt(octet, 16);
    });
}

var buttonCode = {
    left: 1,
    mid: 2,
    right: 3
}

var xcli = x11.createClient(function (err, display) {
    if (!err) {
        var magic = {
            // middle mouse press
            '11 01 0a 00 00 af 00 00 00 00 00 00 00 00 00 00 00 00 00 00': function () {
                xcli.require('xtest', function (err, test) {
                    test.FakeInput(test.ButtonPress, buttonCode.mid, 0, null, 0, 0);
                });
            },
            // middle mouse release
            '11 01 0a 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00': function () {
                // mouse2up
                xcli.require('xtest', function (err, test) {
                    test.FakeInput(test.ButtonRelease, buttonCode.mid, 0, null, 0, 0);
                });
            }
        }

        var lookup = _.reduce(magic, function (mem, func, hex) {
            var bin = new Buffer(parseHex(hex)).toString();
            mem[bin] = func;
            return mem;
        }, {});


        ws.write(new Buffer(parseHex('10 01 0a 35 00 af 03'))); // setup middle mouse
        rs.on('data', function (data) {
            var str = data.toString();

            if (lookup.hasOwnProperty(str)) {
                var ev = lookup[str]();
            }
        });
    }
    else {
        throw err;
    }
});