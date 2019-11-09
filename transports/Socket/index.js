'use strict'

const WebSocket = require('ws')

let serverSocket = null
// FIXME: Add socket ID to header, so that responses can be directed to the appropriate socket.

module.exports = class Socket {
  constructor(config) {
    this.host = config.host
    this.port = config.port

    const ws = useEnvironment('ws', ['WebSocket', 'webkitWebSocket', 'mozWebSocket'])
    this.WS = ws

    if (!ws)
      throw new Error('No websocket library found')
  }

  listen() {
    return serverSocketListen.apply(this, arguments)
  }

  connect() {
    return clientSocketConnect.apply(this, arguments)
  }

  on() {
    onEvent.apply(this, arguments)
  }

  send(message) {
    //console.log('Socket sending message:', message)
    // FIXME: Get socketId from message.

    //this.wss.send(message)
    if (serverSocket)
      serverSocket.send(message)
    else
      this.wss.send(message)
  }
}


function useEnvironment(mod, fallbacks) {
  // Node.js & node-like environments (export as module)
  if (typeof module === 'object' && typeof module.exports === 'object')
    return require(mod)

  // Global export (also applied to Node + node-like environments)
  if (typeof global === 'object')
    return require(mod)

  // UMD
  else if (typeof define === 'function' && define.amd)
    return

  // Browsers and browser-like environments (Electron, Hybrid web apps, etc)
  else if (typeof window === 'object') {
    if (window[mod])
      return window[mod]

    for (let fallback of fallbacks) {
      if (window[fallback])
        return window[fallback]
    }
  }

  return undefined
}



const channels = {
  channelName: [{
    lastMessages: {},
  }],
}

const events = {
  request: function(){},
  response: function(){},
  open: function(){},
}


function heartbeat() {
  this.isAlive = true
}

function serverSocketListen(config) {
  console.log('Socket listen on port:', config.port)

  const WebSocket = require('ws') // TODO: this.WS
  const wss = new WebSocket.Server({ port: config.port })
  this.wss = wss

  let socketID = 0 // TODO: Use UUID for this.

  wss.on('connection', function connection(ws, req) {
    console.log('Connection from:', req.connection.remoteAddress)

    socketID++
    ws._socketID = socketID
    ws._channels = []
    serverSocket = ws

    ws.on('message', onSocketMessage)
    ws.on('close', unsubscribeSocket)
    ws.on('pong', heartbeat)

    ws._send = ws.send
    ws.send = socketSendMessage
    ws.subscribe = subscribeSocket
    ws.unsubscribe = unsubscribeSocket
  })

  // Create ping events for clients.
  setInterval(function ping() {
    wss.clients.forEach(function each(ws) {
      if (ws.isAlive === false)
        return ws.terminate()

      ws.isAlive = false
      ws.ping(function noop(){})
    })
  }, 30 * 1000)
}

function clientSocketConnect(config) {
  return new Promise((resolve, reject) => {
    console.log('Socket connecting on port:', config.port)

    const WebSocket = require('ws') // TODO: this.WS
    const wss = new WebSocket('ws://localhost:8082') //({ port: config.port })
    this.wss = wss

    let socketID = 0 // TODO: Use UUID for this.

    const ws = wss
    ws._send = ws.send
    ws.send = socketSendMessage

    wss.on('open', function connection(_ws, req) {
      // console.log('Connected to:', req.connection.remoteAddress)
      console.log('Connected to:', config.host)
      const ws = wss

      socketID++
      ws._socketID = socketID
      ws._channels = []

      ws.on('message', onSocketMessage)
      ws.on('close', unsubscribeSocket)
      ws.on('pong', heartbeat)

      //ws._send = ws.send
      //ws.send = socketSendMessage
      ws.subscribe = subscribeSocket
      ws.unsubscribe = unsubscribeSocket

      resolve()
    })
  })
}

function onSocketMessage(data) {
  try {
    const message = JSON.parse(data)
    message.sid = this._socketID

    //console.log('Received:', message)

    if (!message.event)
      return

    if (events[message.event])
      events[message.event].call(this, message)

  } catch (err) {
    console.warn('socket.js: Error parsing message')
    console.error(err)

    this.send({ err: 'Error: parsing message' })
  }
}

function socketSendMessage(data) {
  try {
    // Remove any 'Error:' phrases from the message, these are appended on client side.
    if (typeof data.err === 'string')
      data.err = data.err.replace(/Error:/g, '').trim()

    const message = JSON.stringify(data)
    if (this.readyState === WebSocket.OPEN) {
      this._send(message)
    }
  } catch (err) {
    console.error(err)
  }
}

function onEvent(event, cb) {
  events[event] = cb
}

function subscribeSocket(channel) {
  const ws = this

  if (!channels[channel])
    channels[channel] = []

  // Send last messages from channel to new subscriber (using res as a category)
  if (channels[channel].lastMessages) {
    for (let res of Object.keys(channels[channel].lastMessages)) {
      let lastMessage = channels[channel].lastMessages[res]
      ws.send(lastMessage)
    }
  }

  // Ensure client is not already subscribed to the channel.
  if (channels[channel].includes(ws))
    return console.log('Client already subscribed to', channel)

  channels[channel].push(ws)

  // Used for disconnect
  ws._channels.push(channel)
}

function unsubscribeSocket(channelName) {
  const ws = this
  const socketID = ws._socketID

  let unsubChannels
  if (channelName && typeof channelName !== 'number')
    unsubChannels = [channelName]
  else
    unsubChannels = ws._channels

  console.log('Unsubscribing client [' + socketID + '] from:', unsubChannels)

  unsubChannels.forEach(channel => {
    const subs = channels[channel]
    if (!subs)
      return console.log('sockets.js_unsubscribeSocket: Error: No such channel:', channelName)

    const subIndex = subs.findIndex(socket => socket._socketID === socketID)
    if (subIndex < 0)
      return

    subs.splice(subIndex, 1)
  })
}

function sendToChannel(channel, data) {
  try {
    if (!channels[channel])
      return // console.error('socket.js: Error: No channel with that name!', channel) // Trying to send data to a channel that does not exist yet.

    data.channel = channel

    if (data.res) {
      if (!channels[channel].lastMessages)
        channels[channel].lastMessages = {}

      channels[channel].lastMessages[data.res] = data
    }

    const message = JSON.stringify(data)

    for (let ws of channels[channel]) {
      if (ws.readyState === WebSocket.OPEN)
        ws._send(message)
    }
  } catch (err) {
    console.error(err)
  }
}
