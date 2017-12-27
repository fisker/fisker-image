var fiskerImage = require('../../src/fisker-image')
var fs = require('fs')
var path = require('path')
var fixtureDir = path.join(__dirname, '..', 'fixture')
var imgProcessorConfig = {
  maxSize: 400,
  quality: 0.95
}

fs.readdir(fixtureDir, function(err, files) {
  files.forEach(function(file) {
    fs.readFile(path.join(fixtureDir, file), function(err, data) {
      fiskerImage(data, imgProcessorConfig)
        .then(function(blob) {
          fs.writeFileSync(path.join(__dirname, 'output', file), blob)
        })
    })
  })
})
