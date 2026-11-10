# netflix-frontend

Frontend del proyecto Netflix, construido con [Next.js](https://nextjs.org). Consume la API de [netflix-backend](https://github.com/4827-Complejidad-Netflix/netflix-backend) (FastAPI) para mostrar el catálogo de películas, perfiles de usuario con recomendaciones y el análisis del grafo bipartito usuario–película.

## Funcionalidades

| Ruta                 | Descripción                                                                                              |
|----------------------|----------------------------------------------------------------------------------------------------------|
| `/`                  | Redirige a `/movies`                                                                                     |
| `/movies`            | Catálogo con búsqueda por título, filtro por género, orden (popular, título, año) y paginación. Botón ♥ en cada póster para darle me gusta |
| `/recommendations`   | *Para ti*: BFS de 3 niveles desde tus me gusta (likes → usuarios similares → candidatas), con el recuento de cada nivel, las recomendaciones principales y la lista completa de candidatas indicando desde qué likes se llegó a cada una |
| `/users`             | Listado de usuarios con valoraciones positivas y buscador por ID                                         |
| `/users/[id]`        | Perfil del usuario: recomendaciones calculadas con BFS sobre el grafo, el árbol BFS interactivo que las genera y las películas que le gustaron |
| `/graph`             | Estadísticas del grafo: nodos, aristas, densidad y grado medio                                           |
| `/graph/communities` | Detección de comunidades sobre una muestra de usuarios, con UFDS (umbral de Jaccard) o Kruskal (k grupos), visualizada con Cytoscape |

## Stack

| Tecnología   | Versión | Uso                                  |
|--------------|---------|--------------------------------------|
| Next.js      | 16.4.3  | Framework (App Router)               |
| React        | 19.3.0  | Librería de UI                       |
| TypeScript   | 5       | Tipado estático                      |
| Tailwind CSS | 4       | Estilos utilitarios                  |
| Cytoscape.js | 3.34    | Visualización de grafos              |
| ESLint       | 9       | Análisis estático del código         |

## Estructura

```
netflix-frontend/
├── public/                   # Assets estáticos
├── src/
│   ├── app/                  # Rutas (App Router)
│   │   ├── layout.tsx        # Layout raíz con la barra de navegación
│   │   ├── globals.css       # Tema (tokens de color de Tailwind)
│   │   ├── icon.svg          # Ícono de la pestaña
│   │   ├── page.tsx          # Redirección a /movies
│   │   ├── movies/           # Catálogo
│   │   ├── users/            # Listado y perfil de usuarios
│   │   └── graph/            # Estadísticas y comunidades
│   ├── components/           # Componentes de UI (movies/, users/, graph/ y compartidos como Navbar y Logo)
│   └── lib/
│       ├── api/              # Cliente tipado de netflix-backend (client.ts, types.ts)
│       └── communities.ts    # Colores y parámetros de la vista de comunidades
├── .env.example              # Variables de entorno de ejemplo
├── next.config.ts            # Configuración de Next.js
└── tsconfig.json             # Configuración de TypeScript (alias @/* → src/*)
```

## Interfaz

- **Tema oscuro monocromo**: fondo negro, superficies gris casi negro y acciones principales en blanco. Los colores se definen como tokens en `src/app/globals.css` (`background`, `foreground`, `surface`, `border`, `muted`, `danger`, `gold`) y se usan como clases de Tailwind (`bg-surface`, `text-muted`…), así que basta con cambiarlos ahí para ajustar toda la app.
- **Color solo donde aporta información**: los niveles del árbol BFS y las comunidades conservan colores distintos para poder diferenciarlos; el resto de la interfaz es en blanco y negro.
- **Identidad propia**: el logo (`src/components/Logo.tsx`, mismo dibujo que `src/app/icon.svg`) es una insignia con un pequeño grafo usuario–película y el texto *netflix graph* en minúsculas. No usa el logotipo ni los colores de Netflix.
- **Pósters generados**: como aún no hay API de pósters, cada película recibe un degradado oscuro estable derivado de su id.
- La barra de navegación resalta la sección activa (`src/components/NavLinks.tsx`, envuelto en `<Suspense>` porque la ruta actual solo se conoce en ejecución).

## Decisiones de diseño

- **Las llamadas a la API se hacen en el servidor.** Las páginas son Server Components que llaman a `api.*` (`src/lib/api`); los componentes de cliente solo reciben los datos ya cargados. Por eso el navegador nunca habla directamente con el backend y no hace falta configurar CORS para este frontend.
- **Cache Components y Partial Prefetching** activados en `next.config.ts`: el contenido estático de cada página se prerenderiza y los datos de la API se transmiten en streaming dentro de bloques `<Suspense>`.
- **Me gusta en una cookie** (`liked`, ver `src/lib/likes.ts`): no hay cuentas, así que el perfil es del navegador. Al ser cookie, el botón ♥ (cliente) la escribe y `/recommendations` (servidor) la lee para llamar a `POST /api/recommendations` del backend.
- **Estado en la URL**: filtros, página y parámetros de comunidades viven en los search params, así que cualquier vista se puede compartir o recargar.
- **Carpeta `src/`** y **alias `@/*`** para separar el código de la configuración y evitar rutas relativas largas.

## Requisitos

- Node.js 20.9 o superior
- npm
- Una instancia de netflix-backend en ejecución

## Configuración

Copia el archivo de ejemplo y ajusta la URL del backend:

```bash
cp .env.example .env.local
```

| Variable  | Descripción                           | Valor por defecto           |
|-----------|---------------------------------------|-----------------------------|
| `API_URL` | URL base de la API de netflix-backend | `http://localhost:8000/api` |

> `API_URL` no lleva el prefijo `NEXT_PUBLIC_` a propósito: solo la usa el servidor, así que no se expone al navegador. Por lo mismo, el cliente de `src/lib/api` no debe llamarse desde Client Components.

## Primeros pasos

```bash
# Instalar dependencias
npm install

# Levantar el servidor de desarrollo
npm run dev
```

Luego abre [http://localhost:3000](http://localhost:3000). Asegúrate de que el backend esté corriendo en la URL configurada.

## Scripts

| Comando         | Descripción                                    |
|-----------------|------------------------------------------------|
| `npm run dev`   | Servidor de desarrollo con recarga en caliente |
| `npm run build` | Genera el build de producción                  |
| `npm run start` | Sirve el build de producción                   |
| `npm run lint`  | Revisa el código con ESLint                    |

## Despliegue

El proyecto es una app Next.js estándar y se puede desplegar en [Vercel](https://vercel.com) sin configuración adicional:

1. Despliega primero netflix-backend en una URL pública. La instancia actual está en Render: `https://netflix-backend-bdlf.onrender.com` (documentación en `/docs`).
2. Importa este repositorio en Vercel.
3. En *Settings → Environment Variables*, define `API_URL` con la URL pública del backend **incluyendo `/api`**: `https://netflix-backend-bdlf.onrender.com/api`.
4. Despliega. En Vercel, los cambios de variables de entorno solo se aplican en despliegues nuevos: si cambias la URL, vuelve a desplegar.

Para desplegar en un servidor propio:

```bash
npm run build
API_URL=https://mi-backend.example.com/api npm run start   # escucha en el puerto 3000 (configurable con PORT)
```

El servidor del frontend debe poder alcanzar al backend, porque es el que hace las peticiones.
