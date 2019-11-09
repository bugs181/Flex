'use strict'

module.exports = {
  listen: transportsListen,
  connect: transportsConnect,
  send: transportsSend,
}

function loadTransport(transportName) {
  const transport = this.transport[transportName]
  console.log('loadTransport:', transportName, 'with config', transport)

  try {
    const transportModule = require(`./transports/${transportName}`)
    transport.instance = new transportModule(transport)
    transport.initialized = true
  } catch (err) {
    throw new Error('Could not load transport ' + transportName + '\n' + err.message)
  }
}

function transportsListen() {
  for (const transportName of Object.keys(this.transport)) {
    const transport = this.transport[transportName]
    const config = transport.config

    if (!transport.initialized)
      loadTransport.call(this, transportName)

    if (transport.listening)
      continue

    console.log(`Transport '${transportName}' listen: ${config.port}`)
    transport.instance.listen(config)
    initEvents.call(this, transport)

    transport.listening = true
  }
}

async function transportsConnect() {
  for (const transportName of Object.keys(this.transport)) {
    const transport = this.transport[transportName]
    const config = transport.config

    if (!transport.initialized)
      loadTransport.call(this, transportName)

    console.log(`Transport '${transportName}' connect: ${config.host}:${config.port}`)

    initEvents.call(this, transport)

    // TODO: Error checking - try {} catch
    await transport.instance.connect(config)
    this.connected = true // FIXME: Each transport needs it's own connection status.
    // transport.connected = true

    this.Request.onConnect.call(this)
  }
}

async function transportsSend(message) {
  // Loop through transports and send a message.
  // TODO: try {} catch
  for (const transportName of Object.keys(this.transport)) {
    const transport = this.transport[transportName]
    await transport.instance.send(message)
  }
}

function initEvents(transport) {
  transport.instance.on('rpcRequest', (msg) => {
    const fnResult = this.Responder.flexRequest.call(this, msg.data)
    transport.instance.send({ event: 'rpcAnswer', data: fnResult })
  })

  transport.instance.on('rpcAnswer', (msg) => {
    const rpcAnswer = msg.data
    this.Request.flexClientResponse(this, rpcAnswer)
  })

  transport.instance.on('rpcAnswerCallback', (msg) => {
    const rpcAnswer = msg.data
    this.Request.flexClientCallback.call(this, rpcAnswer)
  })
}
