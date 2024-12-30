# Renk Kodu Analizi

Bu uygulama, yüklenen resimlerdeki baskın renkleri analiz eden ve gösteren bir web uygulamasıdır.

## Özellikler

- Resim yükleme (sürükle-bırak, dosya seçme veya kopyala-yapıştır)
- Baskın renklerin analizi
- Tüm renklerin grid görünümü
- İşaretlenmiş resim görünümü
- Modern ve duyarlı arayüz
- Dark mode tasarım

## Teknolojiler

- Node.js
- Express.js
- Sharp (resim işleme)
- TailwindCSS
- HTML5/CSS3/JavaScript

## Kurulum

1. Repoyu klonlayın:
```bash
git clone https://github.com/Mehmetcengiz16/RenkKoduBulucu.git
cd RenkKoduBulucu
```

2. Bağımlılıkları yükleyin:
```bash
npm install
```

3. Uygulamayı başlatın:
```bash
npm start
```

4. Tarayıcınızda şu adresi açın: `http://localhost:3001`

## Kullanım

1. Ana sayfada "Resmi buraya sürükleyin veya tıklayarak seçin" alanına bir resim yükleyin
2. Resmi şu yöntemlerle yükleyebilirsiniz:
   - Sürükle-bırak
   - Dosya seçme düğmesi
   - Kopyala-yapıştır (Ctrl+V)
3. Uygulama resmi analiz edecek ve sonuçları gösterecektir:
   - Baskın Renkler: En çok kullanılan renkleri gösterir
   - Tüm Renkler: Resimdeki tüm renkleri grid görünümünde gösterir
   - İşaretlenmiş Resim: Renklerin resim üzerinde işaretlenmiş halini gösterir

## Lisans

MIT 
