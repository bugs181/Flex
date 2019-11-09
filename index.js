'use strict'

const Responder = require('./response')
const Request = require('./request')
const Transports = require('./transports')

//export default class Flex {
module.exports = class Flex {
  constructor(transport, config) {
    // Server
    this.connected = false // FIXME: Move to transports, store state inside transport object.
    this.keepAlive = false // This feature will allow callbacks to be run more than once. Caution: Uses more memory and should be used with this.done() function.

    // Shared
    this.transportCount = 1
    this.transport = {
      Socket: {
        config: {
          host: 'localhost',
          port: 8082, //"3000" // Default websocket transport
        },

        initialized: false,
        instance: null,
      },
    }
    this.functions = {} // Used for client for caching.

    // Requests for client
    this.requestCount = 0
    this.requests = []

    // FIXME: Remove after testing
    this.Responder = Responder
    this.Request = Request

    Transports.send = Transports.send.bind(this)

    if (transport && config)
      this.use.call(this, transport, config)

    return new Proxy(this, flexProxy)
  }

  use(transport, config) {
    // Delete default Socket transport
    delete this.transport.Socket

    this.transport[transport] = {
      config: {
        host: config && config.host || 'localhost',
        port: config && config.port || 8082,
        ...config,
      },

      initialized: false,
      instance: null,
    }
  }

  listen(port) {
    console.log("listen(port)")

    if (this.transportCount !== 1 && port)
      throw new Error("flex.listen(port) can only be used with a single transport.")

    // TODO: Find only (default?) transport and set its port.
    if (port && this.transportCount === 1)
      this.transport.Socket.config.port = port

    Transports.listen.call(this)
  }

  connect(address) {
    console.log("connect(address)")

    if (this.transportCount !== 1 && address)
      throw new Error("flex.connect(address) can only be used with a single transport.")

    // TODO: Find only (default?) transport and set its port.
    if (address && this.transportCount === 1)
      this.transport.Socket.config.host = address // TODO: Resolve address into host and port

    this.connected = false // FIXME: Each transport needs it's own connection status.
    Transports.connect.call(this)
  }

  add(fn, fnName) {
    console.log('add(fn)')
    Responder.addRemoteFunction.call(this, fn, fnName)
  }
}


const flexProxy = {
  get(flex, prop) {
    return prop in flex ? flex[prop] : Request.flexRequest(flex, prop, flexProxy) // Client.flexClientRequest(flex, prop)
  }
}
