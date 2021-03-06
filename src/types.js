'use strict'
var struct = require('varstruct')
var varint = require('varuint-bitcoin')
var ip = require('ip')
var bufferEquals = require('buffer-equals')

exports.buffer8 = struct.Buffer(8)
exports.buffer32 = struct.Buffer(32)
exports.varBuffer = struct.VarBuffer(varint)

exports.boolean = (function () {
  function encode (value, buffer, offset) {
    return struct.UInt8.encode(+!!value, buffer, offset)
  }

  function decode (buffer, offset, end) {
    return !!struct.UInt8.decode(buffer, offset, end)
  }

  encode.bytes = decode.bytes = 1
  return { encode: encode, decode: decode, encodingLength: function () { return 1 } }
})()

exports.ipAddress = (function () {
  var IPV4_PREFIX = new Buffer('00000000000000000000ffff', 'hex')
  function encode (value, buffer, offset) {
    if (!buffer) buffer = new Buffer(16)
    if (!offset) offset = 0
    if (offset + 16 > buffer.length) throw new RangeError('destination buffer is too small')

    if (ip.isV4Format(value)) {
      IPV4_PREFIX.copy(buffer, offset)
      ip.toBuffer(value, buffer, offset + 12)
    } else if (ip.isV6Format(value)) {
      ip.toBuffer(value, buffer, offset)
    } else {
      throw new Error('Invalid IP address value')
    }

    return buffer
  }

  function decode (buffer, offset, end) {
    if (!offset) offset = 0
    if (!end) end = buffer.length
    if (offset + 16 > end) throw new RangeError('not enough data for decode')

    var start = bufferEquals(buffer.slice(offset, offset + 12), IPV4_PREFIX) ? 12 : 0
    return ip.toString(buffer.slice(offset + start, offset + 16))
  }

  encode.bytes = decode.bytes = 16
  return { encode: encode, decode: decode, encodingLength: function () { return 16 } }
})()

exports.peerAddress = struct([
  { name: 'services', type: exports.buffer8 },
  { name: 'address', type: exports.ipAddress },
  { name: 'port', type: struct.UInt16BE }
])

exports.inventoryVector = struct([
  { name: 'type', type: struct.UInt32LE },
  { name: 'hash', type: exports.buffer32 }
])

exports.alertPayload = struct([
  { name: 'version', type: struct.Int32LE },
  { name: 'relayUntil', type: struct.UInt64LE },
  { name: 'expiration', type: struct.UInt64LE },
  { name: 'id', type: struct.Int32LE },
  { name: 'cancel', type: struct.Int32LE },
  { name: 'cancelSet', type: struct.VarArray(varint, struct.Int32LE) },
  { name: 'minVer', type: struct.Int32LE },
  { name: 'maxVer', type: struct.Int32LE },
  { name: 'subVerSet', type: struct.VarArray(varint, struct.VarString(varint, 'ascii')) },
  { name: 'priority', type: struct.Int32LE },
  { name: 'comment', type: struct.VarString(varint, 'ascii') },
  { name: 'statusBar', type: struct.VarString(varint, 'ascii') },
  { name: 'reserved', type: struct.VarString(varint, 'ascii') }
])

exports.messageCommand = (function () {
  var buffer12 = struct.Buffer(12)

  function encode (value, buffer, offset) {
    var bvalue = new Buffer(value, 'ascii')
    var nvalue = new Buffer(12)
    bvalue.copy(nvalue, 0)
    for (var i = bvalue.length; i < nvalue.length; ++i) nvalue[i] = 0
    return buffer12.encode(nvalue, buffer, offset)
  }

  function decode (buffer, offset, end) {
    var bvalue = buffer12.decode(buffer, offset, end)
    for (var stop = 0; bvalue[stop] !== 0; ++stop);
    for (var i = stop; i < bvalue.length; ++i) {
      if (bvalue[i] !== 0) throw new Error('Found a non-null byte after the first null byte in a null-padded string')
    }
    return bvalue.slice(0, stop).toString('ascii')
  }

  encode.bytes = decode.bytes = 12
  return { encode: encode, decode: decode, encodingLength: function () { return 12 } }
})()

exports.transaction = struct([
  { name: 'version', type: struct.Int32LE },
  {
    name: 'ins',
    type: struct.VarArray(varint, struct([
      { name: 'hash', type: exports.buffer32 },
      { name: 'index', type: struct.UInt32LE },
      { name: 'script', type: exports.varBuffer },
      { name: 'sequence', type: struct.UInt32LE }
    ]))
  },
  {
    name: 'outs',
    type: struct.VarArray(varint, struct([
      { name: 'valueBuffer', type: exports.buffer8 },
      { name: 'script', type: exports.varBuffer }
    ]))
  },
  { name: 'locktime', type: struct.UInt32LE }
])

exports.header = struct([
  { name: 'version', type: struct.Int32LE },
  { name: 'prevHash', type: exports.buffer32 },
  { name: 'merkleRoot', type: exports.buffer32 },
  { name: 'time', type: struct.UInt32LE },
  { name: 'bits', type: struct.UInt32LE },
  { name: 'nonce', type: struct.UInt32LE }
])
