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

// TODO: Use SSE (server sent events)
// https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events
