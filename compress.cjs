const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

const src = 'eng.traineddata';
const dest = 'tesseract/lang/eng.traineddata.gz';

if (!fs.existsSync(src)) {
    console.error(`Source file not found: ${src}`);
    process.exit(1);
}

const inp = fs.createReadStream(src);
const out = fs.createWriteStream(dest);
const gzip = zlib.createGzip();

inp.pipe(gzip).pipe(out);

out.on('finish', () => {
    console.log('Successfully compressed eng.traineddata to tesseract/lang/eng.traineddata.gz');
    // Also copy to dist folder if build is already created
    const distDest = 'dist/tesseract/lang/eng.traineddata.gz';
    if (fs.existsSync('dist/tesseract/lang')) {
        fs.copyFileSync(dest, distDest);
        console.log('Copied to dist/tesseract/lang/eng.traineddata.gz');
    }
});
