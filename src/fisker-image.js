;(function(factory) {
  'use strict'

  var root = Function('return this')()

  if (typeof define === 'function' && define.amd) {
    define([], function() {
      return factory(root)
    })
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory(root)
  } else {
    root.fiskerImage = factory(root)
  }
})(function(root) {
  'use strict'

  var atob = root.atob
  var URL = root.URL || root.webkitURL
  var document = root.document
  var Image = root.Image
  var FileReader = root.FileReader

  var defaultOptions = {
    maxSize: 1500,
    quality: 0.95
  }

  var reBlob = /^blob:/
  var reImage = /^image\//

  var orientationTransforms = [
    // [flip-x, flip-y, deg]
    [false, false, 0], // 1
    [true, false, 0], // 2
    [false, false, 180], // 3
    [false, true, 0], // 4
    [true, false, 90], // 5
    [false, false, 90], // 6
    [true, false, -90], // 7
    [false, false, -90] // 8
  ]

  var isArray =
    Array.isArray ||
    function(x) {
      return Object.prototype.toString.call(x) === '[object Array]'
    }

  var forEach =
    Array.prototype.forEach ||
    function(iteratee) {
      var i = 0
      var len = this.length
      for (; i < len; i++) {
        iteratee.call(this, this[i], i, this)
      }
    }

  var forIn = function(obj, iteratee) {
    var key
    for (key in obj) {
      if (obj.hasOwnProperty(key)) {
        iteratee.call(obj, obj[key], key, obj)
      }
    }
  }

  var assign =
    Object.assign ||
    function(target) {
      var sources = Array.prototype.slice.call(arguments, 1)
      forEach.call(sources, function(source) {
        forIn(source, function(value, key) {
          target[key] = value
        })
      })

      return target
    }

  var blobToUrl = URL
    ? URL.createObjectURL
    : function blobToUrl(blob) {
        var fileReader = new FileReader()
        fileReader.readAsDataURL(blob)
        return new Promise(function(resolve, reject) {
          fileReader.onload = function() {
            resolve(fileReader.result)
          }
          fileReader.onerror = reject
        })
      }

  function blobToArrayBuffer(blob) {
    var fileReader = new FileReader()
    fileReader.readAsArrayBuffer(blob)
    return new Promise(function(resolve, reject) {
      fileReader.onload = function() {
        resolve(fileReader.result)
      }
      fileReader.onerror = reject
    })
  }

  function loadImage(url, revoke) {
    var img = new Image()
    img.src = url
    return new Promise(function(resolve, reject) {
      img.onload = function() {
        if (revoke !== false && URL && reBlob.test(url)) {
          try {
            URL.revokeObjectURL(url)
          } catch (err) {}
        }
        resolve(img)
      }
      img.onerror = reject
    })
  }

  function blobToImage(blob) {
    return Promise.resolve(file)
      .then(blobToUrl)
      .then(loadImage)
  }

  function getScaleSize(img, maxSize, rotated) {
    var scale = 1
    var width = img.width
    var height = img.height

    if (!isArray(maxSize)) {
      maxSize = [maxSize, maxSize]
    }

    var maxWidth = rotated ? maxSize[1] : maxSize[0]
    var maxHeight = rotated ? maxSize[0] : maxSize[1]

    if (maxWidth && width > maxWidth) {
      scale = Math.min(scale, maxWidth / width)
    }

    if (maxHeight && height > maxHeight) {
      scale = Math.min(scale, maxHeight / height)
    }

    return scale
  }

  function getImageTransformInfo(img, orientation, maxSize) {
    var transform =
      orientationTransforms[orientation - 1] || orientationTransforms[0]
    var rotated = Math.abs(transform[2]) === 90
    var scale = getScaleSize(img, maxSize, rotated)

    transform = {
      flipX: transform[0],
      flipY: transform[1],
      deg: transform[2],
      rotated: rotated,
      scale: scale
    }

    if (
      transform.flipX ||
      transform.flipY ||
      transform.deg ||
      transform.scale !== 1
    ) {
      return transform
    }

    return null
  }

  // https://github.com/dominictarr/exif-orientation-lite/blob/master/index.js
  function getOrientationFromBuffer(buffer) {
    var view = new DataView(buffer)
    if (view.getUint16(0, false) !== 0xffd8) {
      // not jpeg
      return
    }
    var length = view.byteLength
    var offset = 2
    var marker
    while (offset < length) {
      marker = view.getUint16(offset, false)
      offset += 2
      if (marker === 0xffe1) {
        if (view.getUint32((offset += 2), false) !== 0x45786966) {
          return
        }
        var little = view.getUint16((offset += 6), false) === 0x4949
        offset += view.getUint32(offset + 4, little)
        var tags = view.getUint16(offset, little)
        offset += 2
        for (var i = 0; i < tags; i++) {
          if (view.getUint16(offset + i * 12, little) === 0x0112) {
            return view.getUint16(offset + i * 12 + 8, little)
          }
        }
      } else if ((marker & 0xff00) !== 0xff00) {
        break
      } else {
        offset += view.getUint16(offset, false)
      }
    }
    return
  }

  // https://github.com/buunguyen/exif-orient/blob/master/exif-orient.js
  function rotateContext(context, deg) {
    var canvas = context.canvas
    var width = canvas.width
    var height = canvas.height

    context.translate(width / 2, height / 2)
    context.rotate(deg * (Math.PI / 180))
    context.translate(-width / 2, -height / 2)

    if (Math.abs(deg) === 90) {
      context.translate((width - height) / 2, -(width - height) / 2)
    }
  }

  // https://github.com/buunguyen/exif-orient/blob/master/exif-orient.js
  function flipContext(context, x, y) {
    var canvas = context.canvas
    var width = canvas.width
    var height = canvas.height

    context.translate(x ? width : 0, y ? height : 0)
    context.scale(x ? -1 : 1, y ? -1 : 1)
  }

  function imageToCanvas(img, transform) {
    var canvas = document.createElement('canvas')
    var context = canvas.getContext('2d')

    var flipX = transform.flipX
    var flipY = transform.flipY
    var scale = transform.scale
    var rotated = transform.rotated
    var deg = transform.deg

    var width = img.width * scale
    var height = img.height * scale

    canvas.width = rotated ? height : width
    canvas.height = rotated ? width : height

    if (flipX || flipY) {
      flipContext(context, flipX, flipY)
    }

    if (deg) {
      rotateContext(context, deg)
    }

    context.drawImage(img, 0, 0, img.width, img.height, 0, 0, width, height)

    return canvas
  }

  function dataURLToBlob(data, type) {
    var bin = atob(data.split(',')[1])
    var length = bin.length
    var arr = new Uint8Array(length)

    forEach.call(bin, function(_, i) {
      arr[i] = bin.charCodeAt(i)
    })

    return new Blob([arr], {
      type: type
    })
  }

  function canvasToBlob(canvas, type, quality) {
    if (canvas.toBlob) {
      return new Promise(function(resolve, reject) {
        canvas.toBlob(resolve, type, quality)
      })
    }

    var dataURL = canvas.toDataURL(type, quality)
    var blob = dataURLToBlob(dataURL, type)
    return Promise.resolve(blob)
  }

  // function blobTofile(blob, name, type) {
  //   return new File([blob], name, {
  //     type: type
  //   })
  // }

  // function canvasToFile(canvas, name, quality, type) {
  //   return canvasToBlob(canvas, quality, type).then(function(blob) {
  //     return blobTofile(blob, name, type)
  //   })
  // }

  function getOrientation(blob) {
    return Promise.resolve(blob)
      .then(blobToArrayBuffer)
      .then(getOrientationFromBuffer)
  }

  function imageProcessor(file, options) {
    options = assign({}, defaultOptions, options)
    var fileType = file.type
    var isImg = reImage.test(fileType)
    var promise = Promise.resolve(file)

    if (!isImg) {
      return promise
    }

    var isJpeg = fileType === 'image/jpeg'
    var fileName = file.name

    var transform
    var orientation
    var orignalImg

    promise = promise
      .then(function() {
        return isJpeg ? getOrientation(file) : 0
      })
      .then(function(orientation) {
        return Promise.resolve(file)
          .then(blobToUrl)
          .then(loadImage)
          .then(function(img) {
            var transform = getImageTransformInfo(
              img,
              orientation,
              options.maxSize
            )
            if (transform) {
              var canvas = imageToCanvas(img, transform)
              return canvasToBlob(canvas, fileType, options.quality)
            }
            return file
          })
      })

    return promise
  }

  return imageProcessor
})
