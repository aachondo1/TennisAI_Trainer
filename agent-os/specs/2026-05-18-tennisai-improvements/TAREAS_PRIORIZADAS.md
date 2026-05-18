# Tareas Priorizadas - TennisAI Trainer
## Lista de Mejoras Accionables por Fase

---

## FASE 1: QUICK WINS (Semana 1 - 14 horas)

### Tarea 1.1: Crear UI Components Library
**Descripción**: Extraer componentes reutilizables a una carpeta centralizada  
**Prioridad**: 🔴 CRÍTICA  
**Esfuerzo**: 8 horas  
**Archivos a crear**:
- `src/components/ui/Card.tsx` - Componente Card reutilizable
- `src/components/ui/Stat.tsx` - Métrica individual
- `src/components/ui/Chart.tsx` - Wrapper para Recharts
- `src/components/ui/LoadingState.tsx` - Estados de carga
- `src/components/ui/ErrorAlert.tsx` - Alertas de error
- `src/components/ui/DateRangePicker.tsx` - Selector de fechas

**Criterios de Aceptación**:
- [ ] Componentes compilables sin errores
- [ ] Reducción de duplicación en Dashboard.tsx, Report.tsx
- [ ] Tests básicos para cada componente
- [ ] Documentación en Storybook (opcional)

---

### Tarea 1.2: Optimizar Recharts con useMemo
**Descripción**: Prevenir recálculos innecesarios de gráficos  
**Prioridad**: 🔴 CRÍTICA  
**Esfuerzo**: 3 horas  
**Archivos a modificar**:
- `src/pages/Dashboard.tsx` - 6 gráficos
- `src/pages/Report.tsx` - 4 gráficos
- `src/components/SessionComparison.tsx` - 2 gráficos

**Cambio de ejemplo**:
```typescript
// Antes:
const chartData = sessions.map(s => ({ date: s.date, score: s.score }));

// Después:
const chartData = useMemo(
  () => sessions.map(s => ({ date: s.date, score: s.score })),
  [sessions]
);
```

**Criterios de Aceptación**:
- [ ] Profiler muestra reducción de re-renders en 30%+
- [ ] Cambios de filtro responden en <100ms

---

### Tarea 1.3: Crear Error Boundary Centralizado
**Descripción**: Componente para capturar y mostrar errores consistentemente  
**Prioridad**: 🟠 ALTA  
**Esfuerzo**: 2 horas  
**Archivos a crear**:
- `src/components/ErrorBoundary.tsx` - Componente boundary

**Criterios de Aceptación**:
- [ ] Captura errores React
- [ ] Muestra UI amigable en lugar de pantalla blanca
- [ ] Opcionalmente: integración con Sentry

---

## FASE 2: FOUNDATION (Semanas 2-3 - 57 horas)

### Tarea 2.1: Crear Service Layer para Supabase
**Descripción**: Centralizar toda la lógica de consultas a base de datos  
**Prioridad**: 🔴 CRÍTICA  
**Esfuerzo**: 35 horas  
**Archivos a crear**:
- `src/services/index.ts` - Barrel export
- `src/services/sessionsService.ts` - Operaciones de sesiones
- `src/services/profilesService.ts` - Operaciones de perfiles
- `src/services/authService.ts` - Operaciones de autenticación
- `src/services/equipmentService.ts` - Operaciones de equipamiento

**Métodos por servicio**:

`sessionsService`:
- `getSessionsByDateRange(userId, from, to)`
- `getSessionById(sessionId)`
- `createSession(data)`
- `updateSession(id, data)`
- `deleteSession(id)`
- `getSessionsByType(userId, type)` 

`profilesService`:
- `getProfile(userId)`
- `updateProfile(userId, data)`
- `getEquipmentBag(userId)`
- `addEquipment(userId, racket)`
- `removeEquipment(userId, racketId)`
- `updateEquipment(userId, racketId, data)`

`authService`:
- Ya existe en AuthContext, mantener coherencia

**Criterios de Aceptación**:
- [ ] Todos los servicios con TypeScript strict
- [ ] Error handling centralizado
- [ ] Tests para cada servicio (30+ test cases)
- [ ] Sin lógica de Supabase en componentes

---

### Tarea 2.2: Agregar API Client Wrapper
**Descripción**: Abstractión sobre Supabase para facilitar cambios de backend  
**Prioridad**: 🟠 ALTA  
**Esfuerzo**: 18 horas  
**Archivos a crear**:
- `src/lib/apiClient.ts` - Cliente centralizado

**Criterios de Aceptación**:
- [ ] Todos los servicios usan apiClient
- [ ] Manejo consistente de errores
- [ ] Logging opcional

---

### Tarea 2.3: Implementar Query Caching
**Descripción**: Cachear resultados de Supabase con TTL  
**Prioridad**: 🟠 ALTA  
**Esfuerzo**: 15 horas  
**Archivos a crear**:
- `src/lib/cache.ts` - Sistema de cache

**Criterios de Aceptación**:
- [ ] 5 minutos TTL por defecto
- [ ] Invalidación manual disponible
- [ ] 50%+ reducción en queries duplicadas

---

## FASE 3: CODE QUALITY (Semanas 4-5 - 135 horas)

### Tarea 3.1: Descomponer Report.tsx (69KB)
**Descripción**: Dividir componente monolítico en 6 componentes menores  
**Prioridad**: 🔴 CRÍTICA  
**Esfuerzo**: 40 horas  
**Estructura destino**:
```
src/pages/Report/
├── Report.tsx (200 líneas) - Orquestador
├── ReportHeader.tsx (150 líneas) - Metadatos
├── ReportScores.tsx (250 líneas) - Scores por golpe
├── ReportCharts.tsx (300 líneas) - Visualizaciones
├── ReportExercisePlan.tsx (180 líneas) - Plan de ejercicios
└── ReportComparison.tsx (200 líneas) - Comparativas
```

**Criterios de Aceptación**:
- [ ] Report.tsx < 350 líneas
- [ ] Cada sub-componente < 300 líneas
- [ ] Mismo funcionamiento visual
- [ ] Tests para cada componente

---

### Tarea 3.2: Descomponer Dashboard.tsx (54KB)
**Descripción**: Dividir en 4 componentes  
**Prioridad**: 🔴 CRÍTICA  
**Esfuerzo**: 30 horas  
**Estructura destino**:
```
src/pages/Dashboard/
├── Dashboard.tsx (200 líneas) - Orquestador
├── DashboardFilters.tsx (250 líneas) - Filtros
├── DashboardCharts.tsx (300 líneas) - Gráficos
├── DashboardMetrics.tsx (150 líneas) - Métricas
└── ActiveJobBanner.tsx (mover de aquí)
```

**Criterios de Aceptación**:
- [ ] Dashboard.tsx < 250 líneas
- [ ] Misma funcionalidad
- [ ] Memoización donde corresponde

---

### Tarea 3.3: Descomponer Upload.tsx (46KB)
**Descripción**: Crear componentes para cada paso del wizard  
**Prioridad**: 🔴 CRÍTICA  
**Esfuerzo**: 25 horas  
**Estructura destino**:
```
src/pages/Upload/
├── Upload.tsx (100 líneas) - Orquestador
├── UploadStep1.tsx (150 líneas) - Tipo de sesión
├── UploadStep2.tsx (180 líneas) - Equipamiento
├── UploadStep3.tsx (200 líneas) - Metadatos
├── UploadStep4.tsx (250 líneas) - Video upload
└── UploadStep5.tsx (150 líneas) - Procesamiento
```

**Criterios de Aceptación**:
- [ ] Upload.tsx < 200 líneas
- [ ] Flujo funcional idéntico
- [ ] Progreso visual claro

---

### Tarea 3.4: Agregar Tests Unitarios
**Descripción**: Cobertura inicial de servicios y utilidades  
**Prioridad**: 🟠 ALTA  
**Esfuerzo**: 40 horas  
**Archivos a crear**:
- `src/__tests__/services/` - Tests de servicios (20+ tests)
- `src/__tests__/utils/` - Tests de utilidades (15+ tests)
- `src/__tests__/components/ui/` - Tests de componentes UI (10+ tests)

**Herramientas**:
- Jest (ya en package.json)
- React Testing Library

**Criterios de Aceptación**:
- [ ] 50+ tests en total
- [ ] Coverage >70% en servicios
- [ ] CI/CD ejecuta tests

---

## FASE 4: PERFORMANCE (Semanas 6-7 - 58 horas)

### Tarea 4.1: Implementar Code Splitting por Rutas
**Descripción**: Carga lazy de componentes por ruta  
**Prioridad**: 🔴 CRÍTICA  
**Esfuerzo**: 25 horas  
**Archivos a modificar**:
- `src/App.tsx` - Router con lazy imports

**Rutas a splitear**:
- Landing (público)
- Login (público)
- Dashboard (protegida)
- Upload (protegida)
- Report (protegida)
- History (protegida)
- Profile (protegida)
- Admin (admin only)
- Profesor (profesor only)

**Criterios de Aceptación**:
- [ ] Bundle principal < 50KB
- [ ] Cada ruta 50-100KB
- [ ] Lazy loading visible en DevTools
- [ ] Suspense fallback visible

---

### Tarea 4.2: Memoizar Componentes Estratégicamente
**Descripción**: Usar React.memo en componentes pesados  
**Prioridad**: 🟠 ALTA  
**Esfuerzo**: 10 horas  
**Componentes a memoizar**:
- DashboardCharts (reduce 200-300ms)
- DashboardMetrics
- ReportCharts
- ReportScores
- SessionComparison
- RankingsTable

**Criterios de Aceptación**:
- [ ] Profiler muestra reducción de renders
- [ ] Sin props cambiando innecesariamente

---

### Tarea 4.3: Optimizar Rendering de Grandes Listas
**Prioridad**: 🟠 ALTA  
**Esfuerzo**: 23 horas  
**Componentes**:
- RankingsTable - Usar virtualización
- History - Usar paginación

**Herramientas**:
- React Window (para listas largas)
- TanStack Table (para DataTables)

**Criterios de Aceptación**:
- [ ] RankingsTable con 1000+ usuarios: <100ms
- [ ] History con 500+ sesiones: <50ms

---

## FASE 5: FEATURES (Semanas 8-12 - 160 horas)

### Tarea 5.1: Completar BoneMappingTab (50 horas)
**Descripción**: Implementar visualización biomecánica completa  
**Prioridad**: 🔵 MEDIA  
**Esfuerzo**: 50 horas  
**Funcionalidades**:
- [ ] Modelo 3D de esqueleto
- [ ] Heatmap de ángulos
- [ ] Comparativa vs. forma ideal
- [ ] Exportación a PDF

---

### Tarea 5.2: Expandir Sistema de Rankings (20 horas)
**Descripción**: Agregar filtros y comparativas  
**Prioridad**: 🔵 MEDIA  
**Esfuerzo**: 20 horas  
**Features**:
- [ ] Filtrar por nivel
- [ ] Ordenar por métrica
- [ ] Mi posición vs. ranking
- [ ] Histórico de cambios

---

### Tarea 5.3: Sistema de Alertas Inteligentes (20 horas)
**Descripción**: Notificaciones automáticas y recomendaciones  
**Prioridad**: 🔵 MEDIA  
**Esfuerzo**: 20 horas  
**Alertas**:
- [ ] Regresión de score
- [ ] Inconsistencia detectada
- [ ] Cambio de equipamiento
- [ ] Hito alcanzado

---

### Tarea 5.4: Social Sharing (30 horas)
**Descripción**: Compartir reportes y competir con amigos  
**Prioridad**: 🔵 MEDIA  
**Esfuerzo**: 30 horas  
**Features**:
- [ ] Share link privado
- [ ] Comparación de técnica
- [ ] Reto entre amigos
- [ ] Leaderboard compartido

---

### Tarea 5.5: Video Playback Mejorado (40 horas)
**Descripción**: Reproductor con overlay de análisis  
**Prioridad**: 🔵 MEDIA  
**Esfuerzo**: 40 horas  
**Features**:
- [ ] Pose overlay
- [ ] Slow-motion
- [ ] Timeline de eventos
- [ ] Anotaciones

---

## FASE 6: ADVANCED (Semanas 13-16 - 185 horas)

### Tarea 6.1: Integración con Wearables (60 horas)
**Descripción**: Conectar Apple Watch, Fitbit, etc.  
**Prioridad**: 🔵 MEDIA  
**Esfuerzo**: 60 horas  

---

### Tarea 6.2: AI-Powered Coaching (70 horas)
**Descripción**: Recomendaciones dinámicas basadas en IA  
**Prioridad**: 🟢 BAJA  
**Esfuerzo**: 70 horas  

---

### Tarea 6.3: Tests de Integración (30 horas)
**Descripción**: Flujos end-to-end  
**Prioridad**: 🟠 ALTA  
**Esfuerzo**: 30 horas  

---

### Tarea 6.4: E2E Tests (25 horas)
**Descripción**: Cypress para user journeys  
**Prioridad**: 🟠 ALTA  
**Esfuerzo**: 25 horas  

---

## RESUMEN DE TAREAS

### Por Fase

| Fase | Duración | Horas | Tareas | Impacto |
|------|----------|-------|--------|---------|
| 1 - Quick Wins | 1 semana | 14h | 3 | 30% menos duplicación |
| 2 - Foundation | 2 semanas | 57h | 3 | Base escalable |
| 3 - Code Quality | 2 semanas | 135h | 4 | 50% reducción bundle |
| 4 - Performance | 2 semanas | 58h | 3 | 60% mejora TTI |
| 5 - Features | 4 semanas | 160h | 5 | +5 features |
| 6 - Advanced | 4 semanas | 185h | 4 | Premium features |
| **TOTAL** | **16 semanas** | **609h** | **22** | **10x mejor** |

### Por Prioridad

```
CRÍTICAS (máximo impacto/esfuerzo):
├─ Tarea 1.1: UI Components (8h) ★★★★★
├─ Tarea 1.2: Recharts Memoization (3h) ★★★★★
├─ Tarea 2.1: Service Layer (35h) ★★★★
├─ Tarea 3.1: Report Refactor (40h) ★★★
├─ Tarea 3.2: Dashboard Refactor (30h) ★★★
├─ Tarea 3.3: Upload Refactor (25h) ★★★
└─ Tarea 4.1: Code Splitting (25h) ★★★

ALTAS (buen impacto/esfuerzo):
├─ Tarea 1.3: Error Boundary (2h) ★★
├─ Tarea 2.2: API Client (18h) ★★
├─ Tarea 2.3: Caching (15h) ★★
├─ Tarea 3.4: Unit Tests (40h) ★★
├─ Tarea 4.2: Memoization (10h) ★★
├─ Tarea 4.3: Large Lists (23h) ★★
└─ Tarea 6.3/6.4: Integration/E2E Tests (55h) ★★

MEDIAS (valor futuro):
├─ Tarea 5.1: BoneMapping (50h)
├─ Tarea 5.2: Rankings (20h)
├─ Tarea 5.3: Alerts (20h)
├─ Tarea 5.4: Social (30h)
├─ Tarea 5.5: Video Player (40h)
└─ Tarea 6.1: Wearables (60h)

BAJAS (features avanzadas):
└─ Tarea 6.2: AI Coaching (70h)
```

---

## GUÍA PARA DESARROLLADORES

### Antes de Empezar

1. **Leer documentación**:
   - `MEJORAS_RECOMENDADAS.md` - Análisis completo
   - Este archivo - Tareas accionables
   - README.md del proyecto - Contexto

2. **Preparar ambiente**:
   ```bash
   npm install
   npm run dev
   npm run lint
   ```

3. **Branching**:
   ```bash
   git checkout -b feat/task-X-description
   ```

### Durante la Tarea

- Escribir tests **primero** (TDD)
- Hacer commits pequeños y descriptivos
- Pedir code review antes de merge
- Actualizar documentación

### Criterios de Done

- ✅ Código escrito
- ✅ Tests pasan (100%)
- ✅ No hay warnings en lint
- ✅ TypeScript strict mode ✓
- ✅ Code review aprobado
- ✅ Documentación actualizada

---

## TRACKING DE PROGRESO

```markdown
- [ ] Tarea 1.1: UI Components
- [ ] Tarea 1.2: Recharts Memoization
- [ ] Tarea 1.3: Error Boundary
- [ ] Tarea 2.1: Service Layer
- [ ] Tarea 2.2: API Client
- [ ] Tarea 2.3: Caching
- [ ] Tarea 3.1: Report Refactor
- [ ] Tarea 3.2: Dashboard Refactor
- [ ] Tarea 3.3: Upload Refactor
- [ ] Tarea 3.4: Unit Tests
- [ ] Tarea 4.1: Code Splitting
- [ ] Tarea 4.2: Memoization
- [ ] Tarea 4.3: Large Lists
- [ ] Tarea 5.1: BoneMapping
- [ ] Tarea 5.2: Rankings
- [ ] Tarea 5.3: Alerts
- [ ] Tarea 5.4: Social Sharing
- [ ] Tarea 5.5: Video Player
- [ ] Tarea 6.1: Wearables
- [ ] Tarea 6.2: AI Coaching
- [ ] Tarea 6.3: Integration Tests
- [ ] Tarea 6.4: E2E Tests
```

---

**Último actualizado**: 2026-05-18  
**Versión**: 1.0  
**Responsable**: Agent-OS Agents  
