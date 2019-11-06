'use strict'

// TODO: Rename: answer.js

module.exports = {
  addRPCFunction: addRPCFunction,
  flexServerRequest: flexServerRequest,
}

function addRPCFunction(fn, fnName) {
  // Allow first or second param to be the string for the name over-ride.
  if (typeof fn === 'string') {
    const arg1 = fn, arg2 = fnName
    fn = arg2
    fnName = arg1
  }

  // If an array of functions was given
  if (typeof fn === 'object' && Array.isArray(fn)) {
    const fnList = fn
    for (let fn of fnList) {
      // Allow anonymous/arrow functions to nest array.
      /* Example: flex.add([
        [() => {}, 'something1'],
        [() => {}, 'something2'],
      ]) */
      if (typeof fn === 'object' && Array.isArray(fn) && fn.length > 1)
        addRPCFunction.call(this, fn[0], fn[1])
      else
        addRPCFunction.call(this, fn)
    }

    return
  }

  if (typeof fn !== 'function')
    throw new Error('Must be a function')

  if (!fnName || typeof fnName !== 'string')
    fnName = fn.name

  if (!fnName)
    throw new Error('Anonymous/Arrow functions are not supported without a label in Flex!')

  if (this.functions[fnName])
    throw new Error(`'${fnName}' Function already added to Flex!`)

  this.functions[fnName] = fn
}

function flexServerRequest(rpcRequest) {
  console.log('Incomming rpcRequest:', rpcRequest)

  // Now we do the inverse and call the function on the server side.
  let rpcAnswer = {
    id: rpcRequest.id,
    req: rpcRequest.req,
    //args: ['success'],
  }

  try {
    const fn = this.functions[rpcRequest.req]
    if (!fn) {
      rpcAnswer.error = 'No Such Function'
      return rpcAnswer
    }

    // Merge the rpcRequest args and callback params in the correct order.
    const fnParams = rpcRequest.args
    for (let param of rpcRequest.callbacks) {
      // TODO: Wrap callback functions. (May cause problems with non-streaming architectures)
      //const cbFunction = wrapFunction(param.fn)
      fnParams.splice(param.index, 1, param.fn)
    }

    rpcAnswer.result = fn.apply(null, rpcRequest.args)
    // rpcAnswer.result = 'pending'
  } catch (err) {
    rpcAnswer.error = err.message
  }

  console.log('rpcAnswer:')
  console.log(rpcAnswer)

  return rpcAnswer
}

function flexServerResponse() {

}
