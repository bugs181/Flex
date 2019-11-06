'use strict'

module.exports = class Koa {
  constructor(config) {
    this.host = config.host
    this.port = config.port

    //const ws = useEnvironment('ws', ['WebSocket', 'webkitWebSocket', 'mozWebSocket'])
    /*this.WS = ws

    if (!ws)
      throw new Error('No websocket library found')
    */

    console.log('Loaded Koa')
  }

  listen() {
    //serverSocketListen.apply(this, arguments)
  }

  connect() {
    return new Promise((resolve, reject) => {

    })
  }

  on() {
    //onEvent.apply(this, arguments)
  }
}
