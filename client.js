'use strict'

// TODO: Rename: request.js

const Transports = require('./transports')

module.exports = {
  flexClientRequest: flexClientRequest,
  onConnect: flexClientConnected,
  flexClientResponse: flexClientResponse,
}

function flexClientRequest(flex, prop, flexProxy) {
  console.log(`flex(fn: ${prop})`)

  if (!flex.connected)
    flex.connect.call(flex)

  // Function returned to client.
  return function() {
    const rpcRequest = {
      id: flex.requestCount++,
      req: prop,
      args: [],
      callbacks: [],
    }

    let argCount = 0
    for (let arg of arguments) {
      if (typeof arg === 'function') {
        rpcRequest.args.push(null)
        rpcRequest.callbacks.push({ index: argCount, fn: arg })
      } else
        rpcRequest.args.push(arg)

      argCount++
    }

    flexSendRequest(flex, rpcRequest)
    // TODO: FIXME: Cannot chain flex, because the 1:1 needs to allow us to `await` on the function result. That way functions that return results will still work.
    // To do something close to chaining, you could use this syntax:

    // flex.do1()
    // .then(_ => flex.do2())
    // .then(...)

    // Better to use Frame for the chaining..

    return new Proxy(flex, flexProxy) //flex
  }
}

function flexClientConnected() {
  console.log('transports.js says were connected')
  processQueue.call(this)
}

function flexSendRequest(flex, rpcRequest) {
  flex.requests.push(rpcRequest)

  console.log('rpcRequest:')
  console.log(rpcRequest)

  // TODO: Add request to the queue. Then once connected, go through the queue.
  // TODO: Transport send()
  // TODO: Transport in()

  // Simulate an RPC send request + answer; FIXME: Remove after testing
  //const rpcAnswer = flex.Server.flexServerRequest.call(flex, rpcRequest)
  //flexClientResponse(flex, rpcAnswer)
  processQueue.call(flex)
}

function flexClientResponse(flex, rpcAnswer) {
  let rpcCallbacks = flex.requests.filter(rpcReq => rpcReq.id === rpcAnswer.id)
  for (let rpcRequest of rpcCallbacks) {
    if (rpcAnswer.error) {
      //rpcRequest.callback.reject.call(null, rpcAnswer.error)
      throw new Error(rpcAnswer.error)
      continue
    }

    //rpcRequest.callback.resolve.apply(null, rpcAnswer.args)
  }
}

function flexClientCallback() {

}

function processQueue() {
  console.log('Processing queue')

  if (!this.connected)
    return console.log('processQueue() - Transport not connected yet.')

  if (this.processingQueue)
    return

  this.processingQueue = true

  const queuedItem = this.requests[0]

  // End of queue
  if (!queuedItem) {
    this.processingQueue = false
    console.log('End of queue')
    return
  }

  queuedItem.status = 'pending'

  //console.log(this)
  //console.log(this.requests)
  Transports.send.call(this, { event: 'rpcRequest', data: queuedItem })
}
