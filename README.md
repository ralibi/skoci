Wrapper for Fetch API

```
npm install skoci --save
```

# Usage
```
var Skoci = require("skoci")

// Instantiate skoci
let instance = new Skoci({
  baseUrl: 'https://github.com',
  url: '/cars/:id.json'
})

// Add a request alias
instance.add(instance, { name: 'retrieve' })
// instance.add(instance, { name: 'retrieve' })

// Add instance success hook
instance.hooks.retrieve.resolved.push (
  (resolved) => {
    console.log(`Hooray, global successfully fetching data`, resolved )
  }
)

// Add global success hook from any instance
instance.addGlobalResolvedHooks(
  (resolved) => {
    console.log(`Hooray, successfully fetching data`, resolved )
  }
)

// Returning list of cars
instance.retrieve({})

// Returning car with `id` `'abc123'` 
instance.retrieve({ id: 'abc123'})

// Add other common aliases
instance.add(instance, { name: 'new', action: 'new' })
instance.add(instance, { name: 'create', method: 'post' })
instance.add(instance, { name: 'edit', action: 'edit' })
instance.add(instance, { name: 'update', method: 'put' })
instance.add(instance, { name: 'delete', method: 'delete' })
```
