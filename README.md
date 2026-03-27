# TennisAI

**Análisis biomecánico automático de tu técnica de tenis potenciado por inteligencia artificial**

[![Status](https://img.shields.io/badge/status-beta-yellow)]() [![License](https://img.shields.io/badge/license-MIT-blue)]() [![Tech Stack](https://img.shields.io/badge/stack-React%20%2B%20TypeScript%20%2B%20Supabase-brightgreen)]()

## 📋 Tabla de Contenidos

- [Introducción](#introducción)
- [Características Principales](#características-principales)
- [Requisitos Previos](#requisitos-previos)
- [Instalación y Setup](#instalación-y-setup)
- [Arquitectura del Proyecto](#arquitectura-del-proyecto)
- [Estructura de Carpetas](#estructura-de-carpetas)
- [Funcionalidades Detalladas](#funcionalidades-detalladas)
- [Guía de Usuario](#guía-de-usuario)
- [API y Tipos de Datos](#api-y-tipos-de-datos)
- [Integraciones Externas](#integraciones-externas)
- [Desarrollo y Comandos](#desarrollo-y-comandos)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)
- [Roadmap](#roadmap)

---

## 🎾 Introducción

**TennisAI** es una plataforma de análisis biomecánico automático que utiliza inteligencia artificial y visión computacional para analizar tu técnica de tenis en detalle. Sube videos de tus entrenamientos y recibe reportes detallados sobre:

- **Análisis técnico por golpe**: Forehand, Backhand, Saque o Mezcla completa
- **Scores biomecánicos**: Evaluación de preparación, punto de impacto, follow-through, posición de pies, ritmo y potencia
- **Métricas clave**: Velocidad de pelota, consistencia, evolución en el tiempo
- **Niveles de skill**: Clasificación automática del nivel general del jugador
- **Recomendaciones personalizadas**: Plan de ejercicios basado en tu análisis

La plataforma es ideal para jugadores de todos los niveles, desde principiantes que buscan mejorar sus fundamentos hasta competidores avanzados que quieren optimizar su técnica.

---

## ✨ Características Principales

### Autenticación y Gestión de Usuario
- Registro e inicio de sesión seguro con Supabase Auth
- Perfiles de usuario con información personal y nivel general
- Gestión de equipamiento (raquetas) con seguimiento de múltiples equipos

### Wizard de Upload Interactivo
- Selección del tipo de sesión (Forehand, Backhand, Saque, Mezcla)
- Gestión de equipamiento asociado a cada sesión
- Configuración de metadatos (fecha, orientación de cámara)
- Soporte para videos MP4 hasta 500MB con validación en tiempo real
- Visualización de cancha 2D con posición de cámara

### Análisis Inteligente
- Pipeline de visión computacional para detección de pose y pelota
- Agentes de IA para análisis biomecánico profundo
- Procesamiento asincrónico con polling en tiempo real
- Feedback de progreso durante el análisis (5-10 minutos típicamente)
- Almacenamiento seguro de videos en Supabase Storage

### Dashboard Interactivo
- Estadísticas globales y por período de tiempo
- Filtrado por fechas predefinidas (hoy, esta semana, este mes, etc.)
- Gráficos de evolución de scores
- Radar chart con análisis de 6 dimensiones técnicas
- Tendencias de consistencia (comparación 1ª vs 2ª mitad del período)
- Distribución de sesiones por tipo de golpe
- Actividad y sesiones recientes
- Micro-métricas en tiempo real (velocidad de pelota, scores por dimensión)

### Historial y Reportes
- Historial completo de todas las sesiones con filtros avanzados
- Reportes detallados por sesión con scores granulares
- Visualización de plan de ejercicios personalizado
- Comparativas entre sesiones
- Descarga de datos analíticos

### Gestión de Perfil
- Información personal del jugador
- Nivel general configurado manualmente
- Bolsa de equipamiento (racquets) con marca, modelo y tamaño de cabezal
- Historial de cambios en el equipamiento
- Edición segura de datos sensibles

---

## 🛠️ Requisitos Previos

Antes de comenzar, asegúrate de tener instalado:

- **Node.js** ≥ 18.0.0 ([Descargar](https://nodejs.org/))
- **npm** ≥ 9.0.0 (viene con Node.js)
- **Git** ([Descargar](https://git-scm.com/))
- **Cuenta Supabase** ([Crear gratis](https://supabase.com/))

### Verificar instalación

```bash
node --version    # v18.x.x o superior
npm --version     # 9.x.x o superior
git --version     # 2.x.x o superior
```

---

## 📦 Instalación y Setup

### 1. Clonar el repositorio

```bash
git clone <repository-url>
cd tennisai
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno

Copia el archivo `.env.example` y complétalo con tus credenciales de Supabase:

```bash
cp .env.example .env
```

Edita `.env` con tus valores:

```env
VITE_SUPABASE_URL=https://[project-id].supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 4. Obtener credenciales de Supabase

1. Accede a [Supabase Dashboard](https://app.supabase.com/)
2. Selecciona tu proyecto
3. Ve a **Settings → API**
4. Copia los valores de:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public** → `VITE_SUPABASE_ANON_KEY`

### 5. Inicializar la base de datos

Las migraciones se aplican automáticamente. Puedes verificar el estado en el SQL Editor de Supabase.

### 6. Iniciar servidor de desarrollo

```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:5173`

---

## 🏗️ Arquitectura del Proyecto

### Stack Tecnológico

```
┌─────────────────────────────────────────────┐
│          Frontend (React + TypeScript)       │
│  - Vite (build tool & dev server)          │
│  - React Router (routing)                   │
│  - Recharts (visualización de datos)        │
│  - Lucide React (iconografía)               │
│  - Tailwind CSS (styling)                   │
└─────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────┐
│    Supabase (Backend as a Service)          │
│  - Autenticación (email/password)           │
│  - Base de datos PostgreSQL                 │
│  - Storage (almacenamiento de videos)       │
│  - Row Level Security (seguridad datos)     │
└─────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────┐
│   Integraciones Externas                    │
│  - Modal.run (Vision Pipeline)              │
│  - Agentes IA (análisis biomecánico)        │
└─────────────────────────────────────────────┘
```

### Flujo de Datos

```
1. Usuario sube video
   ↓
2. Archivo se guarda en Supabase Storage
   ↓
3. URL pública se envía a Modal.run Vision Pipeline
   ↓
4. Pipeline detecta pose y pelota (visión computacional)
   ↓
5. Agentes IA analizan biomecánica
   ↓
6. Resultados se guardan en PostgreSQL (sesiones table)
   ↓
7. Usuario ve reportes en Dashboard y Report pages
```

---

## 📁 Estructura de Carpetas

```
proyecto/
├── src/
│   ├── components/
│   │   ├── Navbar.tsx              # Barra de navegación principal
│   │   ├── ProtectedRoute.tsx       # Wrapper para rutas autenticadas
│   │   └── BoneMappingTab.tsx       # Tab de mapeo biomecánico (futuro)
│   │
│   ├── pages/
│   │   ├── Landing.tsx             # Página de inicio (público)
│   │   ├── Login.tsx               # Formulario de inicio de sesión
│   │   ├── Register.tsx            # Formulario de registro
│   │   ├── Dashboard.tsx           # Dashboard principal con estadísticas
│   │   ├── Upload.tsx              # Wizard de upload de videos
│   │   ├── Report.tsx              # Reporte detallado de sesión
│   │   ├── History.tsx             # Historial de sesiones
│   │   └── Profile.tsx             # Perfil de usuario
│   │
│   ├── contexts/
│   │   └── AuthContext.tsx         # Context de autenticación global
│   │
│   ├── hooks/
│   │   └── useJobPoller.ts         # Hook para polling de análisis
│   │
│   ├── lib/
│   │   ├── supabase.ts             # Instancia cliente Supabase
│   │   └── theme.ts                # Variables de tema y colores
│   │
│   ├── App.tsx                     # Router principal
│   ├── main.tsx                    # Entry point
│   ├── index.css                   # Estilos globales
│   └── vite-env.d.ts              # Tipos Vite
│
├── supabase/
│   └── migrations/
│       └── *.sql                   # Migraciones de base de datos
│
├── public/                         # Archivos estáticos
├── index.html                      # HTML principal
├── vite.config.ts                  # Configuración Vite
├── tailwind.config.js              # Configuración Tailwind
├── postcss.config.js               # Configuración PostCSS
├── eslint.config.js                # Configuración ESLint
├── tsconfig.json                   # Configuración TypeScript
├── package.json                    # Dependencias y scripts
├── .env                            # Variables de entorno (local)
└── README.md                       # Este archivo
```

---

## 🎯 Funcionalidades Detalladas

### 1. Autenticación

TennisAI utiliza autenticación de email/contraseña segura con Supabase:

- **Registro**: Nuevos usuarios se registran con email y contraseña
- **Login**: Acceso con credenciales
- **Logout**: Cierre seguro de sesión
- **Session persistence**: Sesión persiste entre recargas de página

**Archivo relevante**: `src/contexts/AuthContext.tsx`, `src/pages/Login.tsx`, `src/pages/Register.tsx`

### 2. Upload de Videos

Wizard de 5 pasos para subir y analizar videos:

**Paso 1: Tipo de Sesión**
- Forehand: Análisis de derechas
- Backhand: Análisis de reveses
- Saque: Análisis de servicio
- Mezcla: Análisis completo

**Paso 2: Equipamiento**
- Seleccionar raqueta del bolso personal
- Opción de continuar sin seleccionar
- Acceso directo para agregar raquetas

**Paso 3: Metadatos**
- Fecha del entrenamiento
- Orientación de cámara (origen + posición)
- Visualización en tiempo real de posición en cancha

**Paso 4: Upload de Video**
- Drag & drop o clic para seleccionar
- Soporte MP4, máximo 500MB
- Tips para mejores resultados

**Paso 5: Análisis**
- Pantalla de procesamiento con progreso
- ETA: 5-10 minutos típicamente
- Usuario puede cerrar ventana sin interrumpir análisis

**Archivo relevante**: `src/pages/Upload.tsx`

### 3. Dashboard

Panel principal con estadísticas y gráficos:

**Métricas Globales**
- Sesiones totales
- Sesiones últimos 30 días
- Tiempo analizado (estimado)

**Filtros de Período**
- Hoy
- Esta semana
- Este mes
- Semana pasada
- Mes pasado
- Este año
- Año pasado
- Personalizado (rango de fechas)

**Visualizaciones**
- **Evolución de scores**: Línea con scores global, forehand, backhand, saque
- **Radar chart**: 6 dimensiones técnicas (Prep, Impacto, Follow, Pies, Ritmo, Potencia)
- **Tendencia de consistencia**: Comparación 1ª vs 2ª mitad del período
- **Distribución por tipo**: Porcentaje de sesiones por golpe
- **Mejor sesión**: Card con score máximo del período
- **Actividad**: Gráfico de barras con sesiones por fecha

**Micro-métricas**
- Velocidad de pelota (px/frame) por golpe
- Scores detallados por dimensión
- Campos avanzados (pendiente backend)

**Archivo relevante**: `src/pages/Dashboard.tsx`

### 4. Historial de Sesiones

Listado completo de todas las sesiones con:

- Filtros por fecha, tipo de golpe, nivel
- Búsqueda por keywords
- Ordenamiento por fecha o score
- Vista previa rápida de scores
- Acceso directo a reportes

**Archivo relevante**: `src/pages/History.tsx`

### 5. Reportes Detallados

Análisis completo de una sesión específica:

- **Metadatos**: Tipo, fecha, nivel, equipamiento
- **Scores generales**: Global y por golpe
- **Scores por dimensión**: Para cada golpe
- **Recomendaciones**: Plan de ejercicios personalizados
- **Comparativas**: Con promedio del usuario
- **Visualizaciones**: Charts y radar plots

**Archivo relevante**: `src/pages/Report.tsx`

### 6. Perfil de Usuario

Gestión de datos personales y equipamiento:

- **Información personal**: Nombre, nivel general
- **Bolsa de equipamiento**: Agregar, editar, eliminar raquetas
- **Detalles de raqueta**: Marca, modelo, tamaño de cabezal, nickname
- **Historial de cambios**: Seguimiento de equipamiento usado

**Archivo relevante**: `src/pages/Profile.tsx`

---

## 👤 Guía de Usuario

### Flujo de un Nuevo Usuario

1. **Registro**: Visita la página de registro con email y contraseña
2. **Login**: Inicia sesión con tus credenciales
3. **Completar perfil**: Agrega tu nivel general y al menos una raqueta
4. **Primer upload**: Sigue el wizard para subir tu primer video
5. **Ver resultado**: Accede al dashboard y reportes una vez completado

### Realizando un Upload

1. Ve a **Upload** desde la barra de navegación
2. Selecciona el tipo de sesión
3. Elige la raqueta (opcional)
4. Configura la fecha y orientación de cámara
5. Sube tu video (o drag & drop)
6. Espera el análisis (5-10 minutos)
7. Accede al reporte automáticamente

### Interpretando los Scores

**Escala de Scores**: 0-100 puntos

- **80-100**: Excelente - Técnica dominada
- **65-79**: Bueno - Técnica sólida
- **50-64**: Medio - Necesita mejorar
- **0-49**: Bajo - Requiere mucha práctica

**6 Dimensiones Técnicas**:
- **Preparación**: Setup y posición inicial
- **Impacto**: Punto de contacto con la pelota
- **Follow-through**: Finalización del golpe
- **Pies**: Posición y movimiento
- **Ritmo/Cadencia**: Timing y sincronización
- **Potencia**: Generación de velocidad

### Usando el Dashboard

- Selecciona un período con el dropdown de fechas
- Analiza tendencias en evolución de scores
- Compara dimensiones técnicas en el radar chart
- Revisa qué golpes necesitan más trabajo
- Usa micro-métricas para seguimiento detallado

---

## 📊 API y Tipos de Datos

### Tipos TypeScript Principales

#### Session
```typescript
interface Session {
  id: string;
  user_id: string;
  session_type: 'forehand' | 'backhand' | 'saque' | 'mezcla';
  session_date: string;
  camera_orientation: string;
  equipment_used: Racket | null;
  video_url: string;

  global_score: number;
  nivel_general: 'principiante' | 'intermedio' | 'avanzado';

  scores_detalle: {
    forehand: GolpeScores;
    backhand: GolpeScores;
    saque: GolpeScores;
  };

  plan_ejercicios: ExercisePlan[];

  created_at: string;
  updated_at: string;
}

interface GolpeScores {
  total: number;
  scores: {
    [dimension: string]: { score: number; feedback: string };
  };
  metricas_clave: {
    velocidad_pelota_max: number;
    [key: string]: any;
  };
}
```

#### Profile
```typescript
interface Profile {
  id: string;
  email: string;
  nivel_general: 'principiante' | 'intermedio' | 'avanzado';
  equipment_bag: Racket[];
  created_at: string;
  updated_at: string;
}

interface Racket {
  id: string;
  brand: string;
  model: string;
  head_size: string;
  nickname: string;
}
```

#### JobStatus
```typescript
type JobStatus =
  | 'idle'
  | 'uploading'
  | 'vision_processing'
  | 'vision_done'
  | 'agents_processing'
  | 'completed'
  | 'error';
```

### Tablas de Base de Datos

#### `sessions`
Almacena todos los análisis de sesiones

| Columna | Tipo | Descripción |
|---------|------|------------|
| `id` | UUID | Identificador único |
| `user_id` | UUID | Referencia a usuario |
| `session_type` | TEXT | Tipo de golpe |
| `global_score` | INT | Score general (0-100) |
| `scores_detalle` | JSONB | Scores por golpe |
| `plan_ejercicios` | JSONB | Plan personalizado |
| `video_url` | TEXT | URL del video |
| `created_at` | TIMESTAMP | Fecha de creación |

#### `profiles`
Información de usuarios

| Columna | Tipo | Descripción |
|---------|------|------------|
| `id` | UUID | ID usuario (foreign key auth.users) |
| `email` | TEXT | Email del usuario |
| `nivel_general` | TEXT | Nivel general |
| `equipment_bag` | JSONB | Array de raquetas |
| `created_at` | TIMESTAMP | Fecha de creación |

---

## 🔗 Integraciones Externas

### Modal.run Vision Pipeline

**Endpoint**: `https://aachondo--tennis-vision-pipeline-vision-endpoint.modal.run`

**Request**:
```json
{
  "video_url": "https://storage.url/video.mp4",
  "session_type": "forehand",
  "user_id": "uuid",
  "camera_orientation": "Fondo Trasero-Centro",
  "equipment_used": {
    "brand": "Wilson",
    "model": "Blade",
    "nickname": "Mi raqueta"
  }
}
```

**Response**:
```json
{
  "vision_job_id": "job-uuid",
  "status": "processing"
}
```

### Job Polling

El hook `useJobPoller` consulta el estado del análisis cada 3-5 segundos:

```typescript
const poller = useJobPoller({
  onCompleted: (sessionId) => {
    // Navegar a reporte
  },
  onError: (message) => {
    // Manejar error
  }
});

poller.startPolling(vision_job_id);
```

**Estados posibles**:
- `uploading`: Subiendo video
- `vision_processing`: Detectando pose/pelota
- `vision_done`: Visión completada
- `agents_processing`: Agentes IA analizando
- `completed`: Análisis finalizado

---

## 💻 Desarrollo y Comandos

### Scripts disponibles

```bash
# Iniciar servidor de desarrollo
npm run dev

# Compilar para producción
npm run build

# Vista previa de build
npm run preview

# Linting
npm run lint

# Type checking
npm run typecheck
```

### Configuración de Desarrollo

- **Puerto**: 5173 (por defecto de Vite)
- **Hot Module Replacement**: Habilitado
- **Source Maps**: Disponibles en desarrollo
- **Environment**: Variables desde `.env`

### Mejores Prácticas de Desarrollo

1. **Type Safety**: Siempre usa TypeScript, evita `any`
2. **Components**: Componentes funcionales con hooks
3. **Styling**: Combina Tailwind CSS + inline styles (variables de tema)
4. **State Management**: Context para estado global, useState para local
5. **Error Handling**: Try/catch en async, feedback al usuario
6. **Performance**: Usa `useMemo`, `useCallback` para optimización
7. **Accesibilidad**: Labels en inputs, alt text en imágenes

### Archivo de Tema

`src/lib/theme.ts` contiene todas las variables de color:

```typescript
export const C = {
  bg: '#f7f8fa',          // Fondo principal
  surface: '#ffffff',     // Fondo de cards
  accent: '#b5f542',      // Color primario
  blue: '#2563eb',        // Color secundario
  red: '#dc2626',         // Error/advertencia
  green: '#16a34a',       // Éxito
  // ... más colores
};
```

Usa `C.propertyName` para consistencia en toda la app.

---

## 🚀 Deployment

### Preparación pre-deploy

```bash
# Type checking
npm run typecheck

# Linting
npm run lint

# Build local
npm run build

# Verificar build
npm run preview
```

### Deploy en Vercel

1. **Conectar repositorio**: Accede a [Vercel](https://vercel.com) y conecta tu GitHub
2. **Configurar variables de entorno**:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. **Deploy**: Vercel automáticamente detecta Vite
4. **Dominio**: Configura un dominio personalizado

### Deploy en Netlify

1. **Conectar repositorio**: Accede a [Netlify](https://netlify.com)
2. **Build settings**:
   - Build command: `npm run build`
   - Publish directory: `dist`
3. **Agregar variables de entorno** en Site settings → Environment
4. **Deploy**: Netlify construye y despliega automáticamente

### Variables de Entorno en Producción

Configura en tu plataforma de deploy:

```
VITE_SUPABASE_URL=https://[project-id].supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

**Nota**: Las claves comienzan con `VITE_` para exponerse al navegador de forma segura.

### CORS y Seguridad

- Supabase CORS está preconfigurado para producción
- Los videos están protegidos por Storage RLS
- La autenticación se valida en cada request
- Usa Row Level Security para datos de usuario

---

## 🐛 Troubleshooting

### Problemas Comunes

#### "Authentication required" / No puedo acceder a páginas protegidas

**Causa**: Sesión expirada o no autenticado

**Solución**:
1. Limpia caché del navegador
2. Accede a `/login` nuevamente
3. Verifica que Supabase Auth esté configurado correctamente

#### Error al subir video: "File size exceeds limit"

**Causa**: Video supera 500MB

**Solución**:
1. Comprimir video (FFmpeg, HandBrake)
2. Reducir resolución o duración
3. Usar formatos más eficientes (H.265)

#### Análisis tarda más de 10 minutos o se queda en "processing"

**Causa**: Pipeline de Modal.run puede estar lento

**Solución**:
1. Espera hasta 15 minutos
2. Recarga la página (análisis continúa en background)
3. Verifica estado en logs de Modal.run
4. Contacta soporte si persiste más de 30 minutos

#### "Camera orientation not detected" en reporte

**Causa**: Datos de cámara no enviados correctamente

**Solución**:
1. Recarga el reporte
2. Verifica que hayas seleccionado la orientación en el wizard
3. Vuelve a subir el video si persiste

#### Colores no se ven correctamente / UI cortada

**Causa**: Cache de navegador o estilos no cargados

**Solución**:
1. Ctrl+F5 (refresh hard) o Cmd+Shift+R (Mac)
2. Limpia caché: DevTools → Storage → Clear Site Data
3. Verifica que Tailwind CSS esté compilado correctamente

#### No puedo ver mis raquetas en el dropdown

**Causa**: Raquetas no guardadas en perfil

**Solución**:
1. Ve a `/profile`
2. Agrega al menos una raqueta
3. Recarga la página de upload
4. Verifica que aparezcan en "Mi Bolso"

#### Base de datos vacía / Sesiones no cargan

**Causa**: Migraciones no aplicadas o RLS bloqueando acceso

**Solución**:
1. Verifica SQL Editor en Supabase para migraciones
2. Comprueba que RLS policies permitan SELECT a usuarios autenticados
3. Recarga la página
4. Abre DevTools → Console para ver errores exactos

---

## 🗺️ Roadmap

### Fase 1 (Actual)
- ✅ Autenticación y perfiles
- ✅ Upload de videos con metadatos
- ✅ Dashboard con estadísticas
- ✅ Reportes detallados
- ✅ Historial de sesiones
- ✅ Gestión de equipamiento

### Fase 2 (Próximas semanas)
- 📋 Biomechanical mapping interactivo (mapeo de articulaciones)
- 📋 Comparativa entre sesiones (antes/después)
- 📋 Exportar reportes a PDF
- 📋 Compartir reportes con coach
- 📋 Integración con calendarios de entrenamientos

### Fase 3 (Próximos meses)
- 📋 Análisis en tiempo real (live analysis)
- 📋 Recomendaciones de coaching automáticas
- 📋 Comparativa con jugadores de tu nivel
- 📋 Integración con wearables (smartwatch)
- 📋 Mobile app nativa (iOS/Android)

### Fase 4 (Visión a largo plazo)
- 📋 Video annotation interactivo
- 📋 Análisis de carga de trabajo
- 📋 Predicción de lesiones
- 📋 Marketplace de coaches
- 📋 Competencias en línea con análisis

---

## 📞 Soporte y Contacto

### Reportar un Bug

1. Abre una issue en GitHub
2. Describe el problema en detalle
3. Incluye:
   - Navegador y versión
   - Sistema operativo
   - Pasos para reproducir
   - Screenshots o videos

### Preguntas o Sugerencias

- Email: [support@tennisai.com]
- Discord: [Link al servidor]
- Documentación: [wiki]

### Contribuciones

¡Las contribuciones son bienvenidas!

1. Fork el repositorio
2. Crea una rama (`git checkout -b feature/MiFeature`)
3. Commit cambios (`git commit -m 'Add MiFeature'`)
4. Push a rama (`git push origin feature/MiFeature`)
5. Abre Pull Request

---

## 📄 Licencia

Este proyecto está bajo la licencia MIT. Ver `LICENSE` para más detalles.

---

## 🙏 Créditos

Desarrollado con ❤️ para la comunidad de tenis.

- **Visión Computacional**: Modal.run
- **Backend**: Supabase
- **Frontend**: React, TypeScript, Tailwind CSS
- **Gráficos**: Recharts, Lucide React

---

**TennisAI © 2026** — Análisis biomecánico automático potenciado por IA
