const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const app = express();
const port = 3001;

app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

const uploadDir = 'uploads';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Renk analizi fonksiyonu
async function analyzeDominantColors(buffer) {
    try {
        const image = sharp(buffer);
        const metadata = await image.metadata();
        
        // Orijinal resmi kopyala
        const originalBuffer = await image.toBuffer();
        
        // Renk analizi için resmi işle
        const processedBuffer = await image
            .resize(50, 50, { fit: 'cover' })
            .removeAlpha()
            .toColorspace('srgb')
            .raw()
            .toBuffer();

        // RGB değerlerini al ve renk haritası oluştur
        const pixels = [];
        const colorMap = new Map();
        
        for (let y = 0; y < 50; y++) {
            for (let x = 0; x < 50; x++) {
                const i = (y * 50 + x) * 3;
                const pixel = {
                    r: processedBuffer[i],
                    g: processedBuffer[i + 1],
                    b: processedBuffer[i + 2],
                    x: x,
                    y: y
                };
                pixels.push(pixel);
            }
        }

        // Tüm renkleri analiz et
        const allColors = analyzeAllColors(pixels);
        
        // En baskın renkleri bul
        const dominantColors = findDominantColors(pixels, 10);
        
        // İşaretlenmiş resmi oluştur
        const markedImage = await createMarkedImage(buffer, dominantColors, metadata);
        
        return {
            dominantColors: dominantColors.map(color => ({
                hex: rgbToHex(color.r, color.g, color.b),
                rgb: `rgb(${color.r}, ${color.g}, ${color.b})`,
                percentage: color.percentage.toFixed(2),
                locations: color.locations || []
            })),
            allColors: allColors,
            markedImageBuffer: markedImage
        };
    } catch (error) {
        console.error('Renk analizi hatası:', error);
        throw error;
    }
}

// Tüm renkleri analiz et
function analyzeAllColors(pixels) {
    const colorGroups = new Map();
    
    pixels.forEach(pixel => {
        // Renkleri 16'lık gruplara ayır (daha az grup için)
        const groupedR = Math.floor(pixel.r / 16) * 16;
        const groupedG = Math.floor(pixel.g / 16) * 16;
        const groupedB = Math.floor(pixel.b / 16) * 16;
        
        const key = `${groupedR},${groupedG},${groupedB}`;
        if (!colorGroups.has(key)) {
            colorGroups.set(key, {
                r: groupedR,
                g: groupedG,
                b: groupedB,
                count: 0,
                locations: []
            });
        }
        
        const group = colorGroups.get(key);
        group.count++;
        group.locations.push({ x: pixel.x, y: pixel.y });
    });
    
    // Renk gruplarını yüzdelere göre sırala
    const totalPixels = pixels.length;
    const sortedGroups = Array.from(colorGroups.values())
        .map(group => ({
            hex: rgbToHex(group.r, group.g, group.b),
            rgb: `rgb(${group.r}, ${group.g}, ${group.b})`,
            percentage: (group.count / totalPixels) * 100,
            locations: group.locations
        }))
        .sort((a, b) => b.percentage - a.percentage);
    
    return sortedGroups;
}

// İşaretlenmiş resmi oluştur
async function createMarkedImage(buffer, dominantColors, metadata) {
    const image = sharp(buffer);
    const width = metadata.width;
    const height = metadata.height;
    
    // SVG overlay oluştur
    let svgOverlay = `
        <svg width="${width}" height="${height}">
            <style>
                .label { 
                    font-family: Arial; 
                    font-size: 12px; 
                    fill: white; 
                    text-shadow: 1px 1px 2px black;
                }
            </style>
    `;
    
    // Her baskın renk için işaretleme ekle
    dominantColors.forEach((color, index) => {
        const x = 10;
        const y = 20 + (index * 20);
        const hex = rgbToHex(color.r, color.g, color.b);
        
        svgOverlay += `
            <rect x="${x}" y="${y-10}" width="30" height="15" 
                  fill="${hex}" stroke="white" stroke-width="1"/>
            <text x="${x + 40}" y="${y}" class="label">
                ${hex} (${color.percentage.toFixed(1)}%)
            </text>
        `;
    });
    
    svgOverlay += '</svg>';
    
    // İşaretlenmiş resmi oluştur
    const markedImage = await image
        .composite([{
            input: Buffer.from(svgOverlay),
            top: 0,
            left: 0
        }])
        .toBuffer();
    
    return markedImage;
}

// RGB'den HEX'e dönüştürme
function rgbToHex(r, g, b) {
    return '#' + [r, g, b]
        .map(x => Math.max(0, Math.min(255, Math.round(x)))
        .toString(16)
        .padStart(2, '0'))
        .join('');
}

// İki renk arasındaki mesafeyi hesapla
function colorDistance(color1, color2) {
    const rDiff = color1.r - color2.r;
    const gDiff = color1.g - color2.g;
    const bDiff = color1.b - color2.b;
    return Math.sqrt(2 * rDiff * rDiff + 4 * gDiff * gDiff + 3 * bDiff * bDiff);
}

// Dominant renkleri bul
function findDominantColors(pixels, colorCount) {
    let centers = [];
    const step = Math.floor(pixels.length / colorCount);
    
    // Başlangıç merkezlerini seç
    for (let i = 0; i < colorCount; i++) {
        centers.push({ ...pixels[i * step] });
    }

    let clusters = new Array(colorCount).fill().map(() => []);
    let lastCenters = [];
    let iterations = 0;
    const maxIterations = 20;

    while (iterations < maxIterations) {
        lastCenters = centers.map(center => ({ ...center }));
        clusters = new Array(colorCount).fill().map(() => []);

        pixels.forEach(pixel => {
            let minDistance = Infinity;
            let clusterIndex = 0;

            centers.forEach((center, index) => {
                const distance = colorDistance(pixel, center);
                if (distance < minDistance) {
                    minDistance = distance;
                    clusterIndex = index;
                }
            });

            clusters[clusterIndex].push(pixel);
        });

        centers = clusters.map((cluster, i) => {
            if (cluster.length === 0) return lastCenters[i];

            const sum = cluster.reduce((acc, pixel) => ({
                r: acc.r + pixel.r,
                g: acc.g + pixel.g,
                b: acc.b + pixel.b
            }), { r: 0, g: 0, b: 0 });

            return {
                r: Math.round(sum.r / cluster.length),
                g: Math.round(sum.g / cluster.length),
                b: Math.round(sum.b / cluster.length),
                locations: cluster.map(p => ({ x: p.x, y: p.y }))
            };
        });

        const centersChanged = centers.some((center, i) => 
            colorDistance(center, lastCenters[i]) > 1
        );

        if (!centersChanged) break;
        iterations++;
    }

    const results = centers.map((center, i) => ({
        ...center,
        percentage: (clusters[i].length / pixels.length) * 100
    }));

    return results.sort((a, b) => b.percentage - a.percentage);
}

app.post('/analyze', upload.single('image'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'Resim yüklenmedi' });
    }

    try {
        const result = await analyzeDominantColors(req.file.buffer);
        
        // İşaretlenmiş resmi Base64'e çevir
        const markedImageBase64 = result.markedImageBuffer.toString('base64');
        
        res.json({
            colors: result.dominantColors,
            allColors: result.allColors,
            markedImage: `data:image/jpeg;base64,${markedImageBase64}`
        });
    } catch (error) {
        console.error('Hata:', error);
        res.status(500).json({ error: 'Resim analiz edilirken bir hata oluştu' });
    }
});

app.listen(port, () => {
    console.log(`Uygulama http://localhost:${port} adresinde çalışıyor`);
}); 