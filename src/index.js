// Wrap hooks around request
import qs from 'qs'

module.exports = function (opts) {
  // Retain hooks functions
  this.hooks = {}

  // https://.../api
  this.baseUrl = opts.baseUrl

  // /vehicle/cars
  this.url = opts.url

  // Add an alias method
  // name, method, action
  // vessel.add({ name: 'retrieve' })
  // vessel.add({ name: 'create', method: 'post' })
  // vessel.add({ name: 'execute_transition', method: 'post', action: 'execute_transition' })
  this.add = function (vesselObject, aliasObject, config) {
    // Alias object example
    //   { name: 'retrieve' },
    //   { name: 'new', action: 'new' },
    //   { name: 'create', method: 'post' },
    //   { name: 'edit', action: 'edit' },
    //   { name: 'update', action: 'put' },
    //   { name: 'delete', method: 'delete' }
    //   { name: 'execute_transition', method: 'post', action: 'execute_transition' }

    // Generate aliases
    populateRequest(vesselObject, aliasObject, config)
  }

  this.addGlobalBeforeHooks = (fn) => { globalHooks.before.push(fn) }
  this.addGlobalResolvedHooks = (fn) => { globalHooks.resolved.push(fn) }
  this.addGlobalRejectedHooks = (fn) => { globalHooks.rejected.push(fn) }

  return this
}

let globalHooks = getCycle()

function getCycle () {
  return {
    before: [],
    resolved: [],
    rejected: []
  }
}

function getUrl (baseUrl, id, action) {
  let url = baseUrl
  if (id) {
    url += '/' + id
  }
  if (action) {
    url += '/' + action
  }
  return url
}

function populateRequest (vesselObject, val, config) {
  // Prepare local variables
  let key = val.name
  let method = (typeof val.method !== 'undefined') ? val.method : 'get'
  let action = val.action

  // Populate hooks container for a key request
  // vesseleObject.hooks.execute_transition.before.push (params)
  // vesseleObject.hooks.execute_transition.resolved.push (resolved)
  // vesseleObject.hooks.execute_transition.rejected.push (rejected)
  vesselObject.hooks[key] = getCycle()

  // Add alias request
  vesselObject[key] = function (params, data) {
    // Get the `id`
    // Get the `url`
    // Prepare & construct the `args` for request call
    // Call each before hooks
    // Request using fetch
    // Call each resolved hooks, if resolved
    // Call each rejected hooks, if rejected

    let id = params.id
    let url = getUrl(vesselObject.baseUrl + vesselObject.url, id, action)
    let opts = {
      method: method.toUpperCase(),
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'Content-Type': 'application/json'
      }
    }

    // Hook BEFORE request call
    this.hooks[key].before.forEach((f) => { params = f(params) })

    // GLOBAL Hook BEFORE request call
    globalHooks.before.forEach((f) => { params = f(params) })

    if (isMultipartFormData(config)) {
      delete opts.headers['Content-Type']
      opts.body = data
    } else if (!['delete', 'get', 'head', 'options'].includes(method)) {
      // Need body
      opts.body = JSON.stringify({ data: data })
    }

    return new Promise(
      (resolve, reject) => {
        fetch(url + '?' + stringify(params), opts).then(
          (response) => {
            return response.json().then(
              (data) => {
                return {
                  status: response.status,
                  ok: response.ok,
                  data
                }
              }
            )
          }
        ).then(
          (response) => {
            if (response.ok) {
              // GLOBAL Hook RESOLVED request call
              globalHooks.resolved.forEach((f) => f(response))

              // Hook RESOLVED request call
              this.hooks[key].resolved.forEach((f) => f(response))
              return resolve(response)
            } else {
              // GLOBAL Hook REJECTED request call
              globalHooks.rejected.forEach((f) => f(response))

              // Hook REJECTED request call
              this.hooks[key].rejected.forEach((f) => f(response))
              // return Promise.reject(errorResponse)
              // return reject(response)
            }
          }
        ).catch(
          (error) => {
            return reject({ networkError: error.message })
          }
        )
      }
    )
  }
}

function isMultipartFormData (config) {
  return (config !== undefined && config.headers !== undefined && config.headers['Content-Type'] === 'multipart/form-data')
}

function stringify (params) {
  Object.keys(params).forEach((key) => {
    if (typeof (params[key]) === 'object') {
      params[key] = JSON.stringify(params[key])
    }
  })
  return qs.stringify(params)
}
