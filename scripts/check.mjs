import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import sharp from 'sharp';
const manifest=JSON.parse(fs.readFileSync('optimized/manifest.json','utf8'));
let checked=0;
for(const image of Object.values(manifest.images)) {
  assert.equal(fs.statSync(image.original).size,image.originalBytes);
  for(const [width,variant] of Object.entries(image.variants)) {
    const file=path.join('optimized',variant.path);
    assert.equal(fs.statSync(file).size,variant.bytes);
    const metadata=await sharp(file).metadata();
    assert.equal(metadata.width,variant.width);
    assert.equal(metadata.height,variant.height);
    assert(metadata.width<=Number(width));
    checked++;
  }
}
for(const video of Object.values(manifest.videos)) {
  assert.equal(fs.statSync(video.original).size,video.originalBytes);
  for(const type of ['video','preview','poster']) {
    const buffer=fs.readFileSync(path.join('optimized',video[type].path));
    assert.equal(buffer.length,video[type].bytes);
    if(type!=='poster') assert(buffer.indexOf('moov')>0 && buffer.indexOf('moov')<buffer.indexOf('mdat'));
    checked++;
  }
}
console.log(JSON.stringify({images:Object.keys(manifest.images).length,videos:Object.keys(manifest.videos).length,filesChecked:checked}));
