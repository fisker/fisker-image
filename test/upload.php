<?php
$results = array();
$file = $_FILES['file'];
$len = count($file['name']);
$folder = 'upload';

@mkdir($folder);

for ($i = 0; $i < $len; $i ++) {
  $fileName = $file['name'][$i];
  $fileType = $file['type'][$i];
  $fileSize = $file['size'][$i];
  $tempFile = $file['tmp_name'][$i];
  $ext = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));
  $newFileName = md5_file($tempFile);
  $path = $folder . '/' . $newFileName . '.' . $ext;

  $results[$i] = array(
    'name' => $fileName,
    'type' => $fileType,
    'size' => $fileSize,
    'path' => move_uploaded_file($tempFile, $path) ? $path : FALSE,
  );

}

print(json_encode($results));
