const hello = document.createElement('h1')
hello.innerHTML = 'Hello world.'
document.body.append(hello)

// @ts-ignore
if (module.hot) {
  // @ts-ignore
  module.hot.accept()
}
