'use strict'

const Transports = require('./transports')

module.exports = {
  flexRequest: flexRequest,
  onConnect: flexClientConnected,
  flexClientResponse: flexClientResponse,
  flexClientCallback: flexClientCallback,
}

function flexRequest(flex, prop, flexProxy) {
  console.log(`flex(fn: ${prop})`)

  // FIXME: Move to transports file
  if (!flex.connected) // TODO: if (!flex.listening || !flex.connected)
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
    // TODO: Allow the function result to be awaited. Need to put more thought into what the proper return values should be.

    return new Proxy(flex, flexProxy) //flex
  }
}

function flexClientConnected() {
  processQueue.call(this)
}

function flexSendRequest(flex, rpcRequest) {
  flex.requests.push(rpcRequest)

  console.log('rpcRequest:')
  console.log(rpcRequest)

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

  flex.processingQueue = false
}

function flexClientCallback(rpcAnswer) {
  let rpcCallbacks = this.requests.filter(rpcReq => rpcReq.id === rpcAnswer.id)

  for (let rpcRequest of rpcCallbacks) {
    const cb = rpcRequest.callbacks.filter(rpcCallback => rpcCallback.index === rpcAnswer.cid)
    rpcAnswer.args.length = Object.keys(rpcAnswer.args).length
    const args = Array.from(rpcAnswer.args)

    cb[0].fn.apply(null, args)
  }

  this.requests[0].status = 'done'
  if (!this.keepAlive)
    this.requests.splice(0, 1)
}

function processQueue() {
  console.log('Processing queue')

  if (!this.connected)
    return console.log('processQueue() - Transport not connected yet.')

  if (this.processingQueue)
    return console.log('Processing queue')

  this.processingQueue = true

  const queuedItem = this.requests.find(request => request.status !== 'pending' && request.status !== 'done')

  // End of queue
  if (!queuedItem) {
    this.processingQueue = false
    console.log('End of queue')
    return
  }

  queuedItem.status = 'pending'

  Transports.send.call(this, { event: 'rpcRequest', data: queuedItem })
  // NOTE: Queued item will get popped off the stack once we have an ACK, to know that the request has been accepted (but maybe not filled); then we move onto next queued item.
}
