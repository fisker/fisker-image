;(function(root, factory) {
  'use strict'

  if (typeof define === 'function' && define.amd) {
    define([], factory)
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory()
  } else {
    root.uploadFiles = factory()
  }
})(this, function() {
  'use strict'

  var imgProcessor = window.fiskerImage
  var imgProcessorConfig = {
    maxSize: 400,
    quality: 0.95
  }

  function uploadFiles(url, name, orignalFiles) {
    var promises = Array.prototype.map.call(orignalFiles, function(file) {
      var isImg = /^image\//.test(file.type)
      return isImg
          ? imgProcessor(file, imgProcessorConfig)
          : file
    })

    return Promise.all(promises)
      .then(function(processedFiles) {
        var formData = new FormData()
        processedFiles.forEach(function(blob, index) {
          var fileName = orignalFiles[index].name
          formData.append(name, blob, fileName)
        })
        return formData
      })
      .then(function(formData) {
        return $.ajax({
          url: url,
          method: 'POST',
          contentType: false,
          processData: false,
          cache: false,
          dataType : 'json',
          data: formData
        })
      })
  }

  return uploadFiles
})