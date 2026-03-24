const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");
const app = express();
const PORT = 3000;
const cors = require("cors");
app.use(cors({ origin: "http://localhost:4200" }));
app.use(express.json());

async function obtenerNoticiasIDTQ(start = 0) {
  try {
    const url = `https://www.idtq.gov.co/?start=${start}`;

    const { data } = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept-Language": "es-CO,es;q=0.9"
      }
    });

    const $ = cheerio.load(data);
    const noticias = [];

    $("h2 a, h3 a").each((_, el) => {
      if (noticias.length >= 12) return;

      const titulo = $(el).text().trim();
      const enlaceRelativo = $(el).attr("href");

      if (!titulo || !enlaceRelativo) return;
      if (!enlaceRelativo.includes("idtq")) return;

      const contenedor = $(el).closest("div, article");

      let imagen =
        contenedor.find("img").first().attr("src") ||
        contenedor.parent().find("img").first().attr("src") ||
        null;

      if (!imagen) {
        const style = contenedor.find("[style*='background-image']").attr("style");
        if (style) {
          const match = style.match(/url\((.*?)\)/);
          if (match && match[1]) {
            imagen = match[1].replace(/['"]/g, "");
          }
        }
      }

      if (imagen) {
        if (imagen.startsWith("//")) imagen = "https:" + imagen;
        else if (imagen.startsWith("/")) imagen = "https://www.idtq.gov.co" + imagen;
      }

      const enlace = enlaceRelativo.startsWith("http")
        ? enlaceRelativo
        : "https://www.idtq.gov.co" + enlaceRelativo;

      noticias.push({
        titulo,
        imagen,
        enlace
      });
    });

    return noticias;
  } catch (error) {
    console.error("Error scraper:", error.message);
    return [];
  }
}

app.get("/api/noticias", async (req, res) => {
  try {
    const start = Number(req.query.start) || 0;
    const noticias = await obtenerNoticiasIDTQ(start);
    if (!noticias.length) return res.status(500).json({ error: "No se pudieron obtener noticias" });
    res.json(noticias);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener noticias" });
  }
});

app.get("/api/noticia-detalle", async (req, res) => {
  try {
    const url = req.query.url;
    if (!url) return res.status(400).json({ error: "URL requerida" });

    const { data } = await axios.get(url);
    const $ = cheerio.load(data);

    const titulo = $(".itemTitle").text().trim();
    const fecha = $(".itemDateCreated").text().trim();
    let contenido = $(".itemFullText").html() || "";
    let imagen = $(".itemImage img").attr("src") || $(".itemFullText img").first().attr("src") || null;

    if (imagen && imagen.startsWith("/")) imagen = "https://www.idtq.gov.co" + imagen;
    contenido = contenido.replace(/src="\/([^"]+)"/g, 'src="https://www.idtq.gov.co/$1"');

    res.json({ titulo, fecha, imagen, contenido });
  } catch (error) {
    console.error("Error detalle noticia:", error.message);
    res.status(500).json({ error: "Error al obtener detalle" });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor backend corriendo en http://localhost:${PORT}`);
});