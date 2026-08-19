const Tesseract = require('tesseract.js');
const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');

const images = [
    'C:/Users/engen/Downloads/WhatsApp Image 2026-07-13 at 20.08.57.jpeg',
    'C:/Users/engen/Downloads/bdcb4d83-e889-44d4-86de-4e60c21494b3.jpg'
];

async function preprocessAndSave(imgPath, destPath) {
    const img = await loadImage(imgPath);
    const canvas = createCanvas(img.width, img.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    
    const imgData = ctx.getImageData(0, 0, img.width, img.height);
    const d = imgData.data;
    
    // Grayscale + high contrast + invert
    for (let i = 0; i < d.length; i += 4) {
        let gray = 0.299 * d[i] + 0.587 * d[i+1] + 0.114 * d[i+2];
        
        // Binarization with threshold (e.g. 110)
        // If it's bright (glowing digit), make it black (0). Otherwise make it white (255).
        const bin = gray > 115 ? 0 : 255;
        
        d[i] = d[i+1] = d[i+2] = bin;
    }
    
    ctx.putImageData(imgData, 0, 0);
    const buf = canvas.toBuffer('image/jpeg');
    fs.writeFileSync(destPath, buf);
}

async function run() {
    // Check if 'canvas' is installed, if not try simple require or skip canvas part
    try {
        require('canvas');
    } catch(e) {
        console.log("Installing 'canvas' package to test image preprocessing...");
        // Since we don't have canvas installed, let's install it or do pure js manipulation if possible.
        // Actually, we can run npm install canvas first.
    }
}

run();
