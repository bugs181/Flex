'use strict'

const Server = require('./server')
const Client = require('./client')
const Transports = require('./transports')

//export default class Flex {
module.exports = class Flex {
  constructor() {
    // Server
    this.isServer = false
    this.listening = false
    this.connected = false
    this.expectedReturnTypes = true

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
    this.Server = Server
    this.Client = Client

    return new Proxy(this, flexProxy)
  }

  use(transport, address) {
    // Delete default Socket transport
    delete this.transport.Socket

    this.transport[transport] = {
      config: {
        host: 'localhost',
        port: 8082,
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

    this.isServer = true
    Transports.listen.call(this)
  }

  connect(address) {
    console.log("connect(address)")

    if (this.transportCount !== 1 && address)
      throw new Error("flex.connect(address) can only be used with a single transport.")

    // TODO: Find only (default?) transport and set its port.
    if (address && this.transportCount === 1)
      this.transport.Socket.config.host = address // TODO: Resolve address into host and port

    this.isServer = false // FIXME: Allow flex to be both a client and a server instance. For example, proxying public requests to alt Flex transports.
    this.connected = false // FIXME: Each transport needs it's own connection status.
    Transports.connect.call(this)
  }

  add(fn, fnName) {
    console.log('add(fn)')
    if (!this.listening)
      this.listen()

    Server.addRPCFunction.call(this, fn, fnName)
  }
}


const flexProxy = {
  get(flex, prop) {
    return prop in flex ? flex[prop] : Client.flexClientRequest(flex, prop, flexProxy) // Client.flexClientRequest(flex, prop)
  }
}

// TODO: FIXME: Store transport config outside of object so that it cant be messed with.
