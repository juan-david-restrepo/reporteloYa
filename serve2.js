// serve2.js
const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer');

const app = express();
const PORT = 3001;

app.use(cors());

app.get('/api/senales', async (req, res) => {
  let browser;
  try {
    browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    await page.goto('https://practicatest.co/senales-transito-colombia', { waitUntil: 'networkidle2' });
    await page.waitForSelector('h2.apartado', { timeout: 15000 });

    const senales = await page.evaluate(() => {
      const result = [];

      document.querySelectorAll('h2.apartado').forEach(h2 => {
        const titulo = h2.innerText.toLowerCase();
        let tipo = null;
        if (titulo.includes('reglament')) tipo = 'reglamentarias';
        else if (titulo.includes('peligro') || titulo.includes('prevent')) tipo = 'preventivas';
        else if (titulo.includes('inform')) tipo = 'informativas';
        else if (titulo.includes('transitor')) tipo = 'transitorias';

        if (tipo) {
          let parent = h2.parentElement;
          const imgs = parent.querySelectorAll('img');

          imgs.forEach(img => {
            // Nombre: SR-01_PARE → SR-01 PARE
            let nombre = img.src.split('/').pop().split('.')[0].toUpperCase();
            nombre = nombre.replace(/_/g, ' ');

            let descripcion = '';
            let nextP = img.nextElementSibling;
            if (nextP && nextP.tagName === 'P') descripcion = nextP.innerText.trim();

            let imagen = img.src;
            if (imagen && !imagen.startsWith('http')) imagen = 'https://practicatest.co' + imagen;

            result.push({ tipo, nombre, descripcion, imagen });
          });
        }
      });

      return result;
    });

    await browser.close();
    res.json(senales);

  } catch (err) {
    if (browser) await browser.close();
    console.error('Error scraping señales:', err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => console.log(`Backend corriendo en http://localhost:${PORT}`));