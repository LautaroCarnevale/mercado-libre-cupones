# Mercado Libre Cupones 🎫

Una extensión premium de navegador (compatible con **Chrome** y **Firefox**) diseñada para detectar, listar y activar automáticamente cupones de descuento en Mercado Libre mediante llamadas a una API externa y análisis contextual de la página en tiempo real.

---

## 🚀 Características Principales

- **Detección Automática**: Analiza la página del producto y el carrito para identificar cupones aplicables.
- **Activación en un Click**: Permite aplicar cupones de forma individual o masiva sin salir de la página de Mercado Libre.
- **Multi-Navegador**: Soporte nativo y optimizado tanto para Google Chrome (Manifest V3) como para Mozilla Firefox (Manifest V2/V3).
- **Interfaz Moderna**: Panel de control interactivo desarrollado en React con un diseño limpio, responsivo y adaptado al ecosistema moderno.
- **Configuración Personalizada**: Permite configurar la URL base de la API de cupones directamente desde la página de opciones de la extensión.

---

## 🛠️ Arquitectura del Proyecto

El código está estructurado de forma modular y tipado estrictamente con TypeScript:

```text
src/
├── background/   # Service Worker (Chrome) / Background script (Firefox)
├── content/      # Content scripts inyectados para scraping y manipulación del DOM
├── popup/        # Interfaz de usuario principal al hacer click en el icono (React)
├── options/      # Página de configuración y preferencias de la extensión (React)
├── services/     # Clientes de API, lógica de obtención y activación de cupones
├── store/        # Estado persistente utilizando la API de chrome.storage
├── types/        # Tipos y contratos compartidos de TypeScript
├── utils/        # Logger interno, utilidades de sanitización y abstracción del browser
└── shared/       # Constantes y gestión de errores personalizados
```

---

## 📦 Requisitos Previos

Asegúrate de tener instalado en tu entorno de desarrollo:
- **Node.js** (Versión 18 o superior)
- **pnpm** (Gestor de paquetes recomendado)

---

## 🔧 Instalación y Configuración

1. **Instalar dependencias:**
   ```bash
   pnpm install
   ```

2. **Configurar variables de entorno:**
   Copia el archivo de ejemplo para configurar tus variables locales:
   ```bash
   cp .env.example .env
   ```
   Edita el archivo `.env` según tus necesidades:
   - `VITE_API_BASE_URL`: URL base de la API externa de cupones.
   - `VITE_API_TIMEOUT`: Tiempo límite de espera para las peticiones a la API (en ms).

   > 💡 **Nota:** Las variables de entorno se inyectan en tiempo de compilación (build-time). No almacenes secretos sensibles aquí, ya que el código de la extensión es visible para el cliente.

---

## 🏗️ Compilación y Construcción

Para generar el build de la extensión para tu navegador preferido:

```bash
# Compilar para Chrome (por defecto)
pnpm run build

# Compilar para Chrome de forma explícita
pnpm run build:chrome

# Compilar para Firefox
pnpm run build:firefox
```

El resultado compilado y listo para producción se generará en la carpeta `dist/`.

---

## 📥 Instalación en el Navegador

### En Google Chrome (y navegadores basados en Chromium)
1. Abre tu navegador y dirígete a `chrome://extensions/`.
2. Activa el **Modo de desarrollador** en la esquina superior derecha.
3. Haz click en el botón **Cargar descomprimida** (Load unpacked).
4. Selecciona la carpeta `dist/` en el directorio de este proyecto.

### En Mozilla Firefox
1. Abre Firefox y navega a `about:debugging#/runtime/this-firefox`.
2. Haz click en **Cargar complemento temporal...** (Load Temporary Add-on...).
3. Selecciona el archivo `dist/manifest.json`.

---

## 🔌 Contrato de la API Externa

La extensión interactúa con un backend que provee la información de los cupones. A continuación se listan los endpoints consumidos:

| Método | Ruta | Descripción |
| :--- | :--- | :--- |
| **GET** | `/health` | Verifica el estado del servidor. |
| **GET** | `/categories` | Obtiene el listado de categorías disponibles. |
| **GET** | `/coupons` | Retorna los cupones activos (admite query param `?category=X`). |
| **POST** | `/coupons/activate` | Activa un cupón específico para el usuario. |
| **POST** | `/coupons/activate-bulk` | Permite la activación masiva de múltiples cupones. |

---

## 🔒 Permisos Requeridos

| Permiso | Propósito |
| :--- | :--- |
| `storage` | Guarda localmente el historial de cupones, caché del estado y configuración. |
| `activeTab` | Provee acceso temporal a la pestaña activa para inyecciones del script. |
| `scripting` | Ejecuta de forma segura scripts en el contexto de Mercado Libre. |
| `notifications` | Notifica al usuario de forma no intrusiva al activar un cupón. |
| `host_permissions` | Permite peticiones seguras exclusivamente a dominios de Mercado Libre y a la API configurada. |

---

## ⚠️ Consideraciones Técnicas

- **Fragilidad del Scraping**: Las clases CSS y selectores del DOM de Mercado Libre (`ui-pdp-title`, `andes-breadcrumb`, etc.) están sujetos a cambios sin previo aviso. Se utilizan múltiples estrategias de fallback, pero es posible que se requiera mantenimiento continuo.
- **Rate Limiting**: Se incluye una política interna de reintentos con retraso exponencial para mitigar bloqueos o límites de cuota por parte de la API de Mercado Libre.
- **Seguridad**: Toda lógica del frontend es completamente auditable. No compartas claves de API secretas en el bundle final.
