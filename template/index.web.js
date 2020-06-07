const hello = document.createElement('h1')
hello.innerHTML = 'Hello world.'
document.body.append(hello)

if (module.hot) {
  module.hot.accept()
}
