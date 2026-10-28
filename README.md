# netflix-frontend

Frontend del proyecto Netflix, construido con [Next.js](https://nextjs.org).

## Initial commit

El commit inicial deja configurada la base del proyecto, generada con `create-next-app`. Todavía no tiene funcionalidades propias: solo la estructura, las dependencias y la configuración necesarias para empezar a desarrollar.

### Stack

| Tecnología   | Versión | Uso                                  |
|--------------|---------|--------------------------------------|
| Next.js      | 16.4.3  | Framework (App Router)               |
| React        | 19.3.0  | Librería de UI                       |
| TypeScript   | 5       | Tipado estático                      |
| Tailwind CSS | 4       | Estilos utilitarios                  |
| ESLint       | 9       | Análisis estático del código         |

### Estructura

```
netflix-frontend/
├── public/               # Assets estáticos (imágenes, íconos, SVG)
├── src/
│   └── app/              # Rutas de la aplicación (App Router)
│       ├── layout.tsx    # Layout raíz compartido por todas las páginas
│       ├── page.tsx      # Página de inicio (/)
│       ├── globals.css   # Estilos globales e import de Tailwind
│       └── favicon.ico
├── eslint.config.mjs     # Configuración de ESLint
├── next.config.ts        # Configuración de Next.js
├── tsconfig.json         # Configuración de TypeScript (alias @/* → src/*)
├── package.json          # Dependencias y scripts
├── package-lock.json     # Versiones exactas de las dependencias
├── AGENTS.md             # Instrucciones para asistentes de IA (generado por Next.js)
└── .gitignore            # Archivos excluidos de git (node_modules, .next, .env*, .idea, etc.)
```

### Decisiones de configuración

- **App Router** en lugar de Pages Router, que es el enfoque recomendado actualmente por Next.js.
- **Carpeta `src/`** para separar el código de la aplicación de los archivos de configuración.
- **Alias `@/*`**: permite importar con `@/components/Navbar` en lugar de rutas relativas como `../../components/Navbar`.
- **`.idea/` ignorado**: la configuración del IDE (WebStorm) no se sube al repositorio.

## Requisitos

- Node.js 20.9 o superior
- npm

## Primeros pasos

```bash
# Instalar dependencias
npm install

# Levantar el servidor de desarrollo
npm run dev
```

Luego abre [http://localhost:3000](http://localhost:3000). La página se recarga automáticamente al editar `src/app/page.tsx`.

## Scripts

| Comando         | Descripción                                  |
|-----------------|----------------------------------------------|
| `npm run dev`   | Servidor de desarrollo con recarga en caliente |
| `npm run build` | Genera el build de producción                |
| `npm run start` | Sirve el build de producción                 |
| `npm run lint`  | Revisa el código con ESLint                  |
