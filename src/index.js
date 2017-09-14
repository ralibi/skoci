// Wrap hooks around request
import qs from 'qs'

module.exports = function (opts = {}) {
  // Retain hooks functions
  this.hooks = {}

  // https://.../api
  this.baseUrl = opts.baseUrl

  // /vehicle/cars
  this.url = opts.url

  // /vehicle/cars?params=coo
  this.params = opts.params || {}

  // Add an alias method
  // name, method, action
  // skoci.add({ name: 'retrieve' })
  // skoci.add({ name: 'create', method: 'post' })
  // skoci.add({ name: 'execute_transition', method: 'post', action: 'execute_transition' })
  this.add = function (skociObject, aliasObject, config) {
    // Alias object example
    //   { name: 'retrieve' },
    //   { name: 'new', action: 'new' },
    //   { name: 'create', method: 'post' },
    //   { name: 'edit', action: 'edit' },
    //   { name: 'update', action: 'put' },
    //   { name: 'delete', method: 'delete' }
    //   { name: 'execute_transition', method: 'post', action: 'execute_transition' }

    // Generate aliases
    populateRequest(skociObject, aliasObject, config)
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

// Return url appended with an `action`
// All `:pattern` in `url` will be replace by `params['pattern']`
function getUrl (url, params, action) {
  let resultUrl = url.replace(/:([a-zA-Z_]+)/g, function (match, offset) { return params[offset] ? params[offset] : '' })

  // replace `abc/.ext` to `abc.ext`
  resultUrl = resultUrl.replace(/\/\./, '.')

  // append an `action`
  if (action) {
    // insert action right before an extension if there is an extention
    let extPattern = /(\.[a-z]{2,5})$/
    if ((resultUrl.match(extPattern) || []).length) {
      resultUrl = resultUrl.replace(extPattern, '/' + action + '$1')
    } else {
      resultUrl += '/' + action
    }
  }
  return resultUrl
}

function populateRequest (skociObject, val, config = {}) {
  // Prepare local variables
  let key = val.name
  let method = (typeof val.method !== 'undefined') ? val.method : 'get'
  let action = val.action
  let defaultParams = skociObject.params

  // Populate hooks container for a key request
  // skociObject.hooks.execute_transition.before.push (params)
  // skociObject.hooks.execute_transition.resolved.push (resolved)
  // skociObject.hooks.execute_transition.rejected.push (rejected)
  skociObject.hooks[key] = getCycle()

  // Add alias request
  skociObject[key] = function (params = {}, data = {}, opts = {}) {
    // Get the `id`
    // Get the `url`
    // Prepare & construct the `args` for request call
    // Call each before hooks
    // Request using fetch
    // Call each resolved hooks, if resolved
    // Call each rejected hooks, if rejected

    opts.method = (opts.method || method).toUpperCase()
    opts.headers = opts.headers || config.headers || {
      'Accept': 'application/json, text/plain, */*',
      'Content-Type': 'application/json'
    }

    opts.params = Object.assign({}, defaultParams, opts.params, params)

    if (opts.headers['Content-Type'] === 'multipart/form-data') {
      // data is a FormData object, keep it that way
      opts.data = data
    } else {
      opts.data = Object.assign({}, opts.data, data)
    }

    // Hook BEFORE request call
    this.hooks[key].before.forEach((f) => { opts = f(opts) })

    // GLOBAL Hook BEFORE request call
    globalHooks.before.forEach((f) => { opts = f(opts) })

    if (skociObject.baseUrl === undefined || skociObject.url === undefined) {
      console.error('To request an api, please provide either `baseUrl` or `url` or both when instantiate a Skoci instance')
      return
    }
    let url = getUrl(skociObject.baseUrl + skociObject.url, opts.params, action)

    if (opts.headers['Content-Type'] === 'multipart/form-data') {
      opts.body = opts.data

      // headers['Content-Type'] should be removed so the browser can append a Boundary for `multipart/form-data`
      delete opts.headers['Content-Type']
    } else if (!['DELETE', 'GET', 'HEAD', 'OPTIONS'].includes(opts.method)) {
      // Need body
      opts.body = JSON.stringify(opts.data)
    }

    return new Promise(
      (resolve, reject) => {
        fetch(url + '?' + stringify(opts.params), opts).then(
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

function stringify (params) {
  Object.keys(params).forEach((key) => {
    if (typeof (params[key]) === 'object') {
      params[key] = JSON.stringify(params[key])
    }
  })
  return qs.stringify(params)
}
