# Backend SIMIT para Angular

## Descripción
Backend Express.js para consulta de multas SIMIT integrado en el proyecto Angular.

## Ubicación
`src/app/backend-simit/`

## Para ejecutar

```bash
# Ir a la carpeta del backend
cd src/app/backend-simit

# Instalar dependencias
npm install

# Ejecutar servidor
npm start
```

El servidor se ejecutará en `http://localhost:3000`

## Estructura
```
backend-simit/
├── server.js           # Servidor principal
├── routes/
│   └── consulta.js     # Rutas API
├── services/
│   ├── simitService.js          # API gratuita
│   └── simitWorkerService.js   # Cloudflare Worker
├── pdf/
│   └── pdfGenerator.js         # Generador de PDFs
└── package.json
```

## Endpoints API
- `POST /api/consultar` - Consultar multas
- `POST /api/generar-pdf` - Generar PDF
- `GET /api/estado` - Estado del servicio
- `GET /api/info` - Información de la API
