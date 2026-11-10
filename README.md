# Cronomister · Escuela de Fútbol Mareo (BETA v1)

Herramienta web responsive (mobile-first y escritorio) instalable como PWA para entrenadores y delegados de fútbol base (categorías 5 a 8 años: Pre C, Debutantes B y Debutantes A). Diseñada para ofrecer registros fiables, inmutables y trazables de **asistencia a entrenamientos**, **minutos reales jugados por partido** y **anotaciones técnicas**, cumpliendo con la normativa de protección de datos de menores (RGPD y LOPDGDD).

---

## 🚀 Características Principales

1. **Gestión Multiequipo con Aislamiento Estricto**:
   - Equipos: **Pre C**, **Debutantes B** y **Debutantes A**.
   - Ajustes técnicos por equipo: número de jugadores en pista (def. 5), duración de las partes (def. 25 min), selector de días de entrenamiento (martes y jueves por defecto) y activación/desactivación de puestos en el campo.
   - Aviso visual automático si Debutantes B o A no han sido ajustados.

2. **Roles de Acceso y Seguridad**:
   - **Entrenador Principal (Admin)**: Control total, ajuste de equipos, creación/edición/borrado de jugadores, invitación de delegados y exportación/supresión de datos RGPD.
   - **Delegados**: Registro de asistencia, convocatoria, control de partidos y anotaciones. Restricción estricta de borrado.

3. **Control de Entrenamientos y Asistencia**:
   - Detección inteligente del día actual ("Hoy es martes") sugiriendo la sesión programada.
   - Flujo de asistencia en 2 toques: *Vino* / *No vino* $\rightarrow$ *Avisó* / *No avisó*.
   - Bloqueo preventivo de ausencias o asistencias en fechas futuras.
   - Anotaciones generales de la sesión y notas individuales por jugador.

4. **Motor de Cronómetro Inmutable Basado en Eventos**:
   - No depende de contadores en pantalla ni de la tasa de refresco del navegador.
   - Registra eventos discretos con timestamp UTC real: `MATCH_START`, `CLOCK_PAUSE`, `CLOCK_RESUME`, `SUBSTITUTION`, `HALF_END`, `SECOND_HALF_START`, `MATCH_END` y goles.
   - **Sustituciones en 2 toques**: toque sobre el jugador en pista $\rightarrow$ toque sobre el jugador del banquillo.
   - **Resistencia a suspensión y bloqueo de pantalla**: al reactivar el móvil, recalcula los segundos de juego efectivo sin perder tiempo.
   - **Descuento de pausas**: tiempos muertos o lesiones no acumulan minutos de juego.
   - **Control Exclusivo (Match Lock)**: solo un dispositivo a la vez puede accionar el cronómetro; los demás acceden en modo monitor en tiempo real. El entrenador dispone de potestad para forzar la toma de control si el delegado agota batería.
   - Auditoría de origen en cada minutaje: `directo`, `manual` o `estimado`.
   - Selector de velocidad para pruebas de campo: x1, x30, x120.

5. **Plantilla e Importación CSV**:
   - CRUD de jugadores (dorsal, nombre, apellidos, puesto opcional).
   - Importador masivo por CSV (formato `Dorsal,Nombre,Apellidos,Puesto`).

6. **Ficha Técnica y Generación de PDF Oficial**:
   - KPIs automáticos: minutos totales, media por partido jugado, % de tiempo disputado y % de asistencia.
   - Gráfica interactiva de minutos por jornada y barra apilada de asistencia.
   - Generación de informe PDF 100% idéntico al modelo de dirección técnica de Mareo (cabecera roja `#c01c1c`, tabla de partidos, tabla de entrenos, desglose de faltas y pie numerado).

---

## 🛠️ Stack Tecnológico

- **Frontend**: Next.js 15 (App Router) + React 19 + TypeScript + Tailwind CSS.
- **Iconografía**: Lucide React.
- **Generación de Informes**: jsPDF + jspdf-autotable (ejecución en cliente, compatible offline).
- **Testing**: Vitest (tests automatizados de minutaje por intervalos, tiempos muertos y recuperación de pantalla).
- **Backend / Persistencia**:
  - Supabase PostgreSQL es la fuente compartida para equipos, jugadores, entrenamientos, asistencias, partidos, eventos y notas.
  - `localStorage` se utiliza como caché local; los cambios autenticados se sincronizan con Supabase y se consultan periódicamente para reflejarlos en otros dispositivos.
  - El estado se guarda en JSONB por equipo para conservar los identificadores actuales; el acceso se valida en el servidor antes de leer o escribir.

---

## 📦 Instalación y Puesta en Marcha

### Requisitos Previos
- Node.js versión 20.x o 22.x
- npm versión 10.x o superior

### 1. Clonar el repositorio e instalar dependencias
```bash
npm install
```

### 2. Configuración de Variables de Entorno
Copia el archivo `.env.example` a `.env.local`:
```bash
cp .env.example .env.local
```
*(Para uso local, no es obligatorio configurar Supabase inmediatamente: la aplicación arranca automáticamente con los datos semilla precargados).*

### 3. Ejecutar en modo desarrollo
```bash
npm run dev
```
Abre en tu navegador: [http://localhost:3000](http://localhost:3000)

### 4. Ejecutar tests unitarios
```bash
npm test
```

### 5. Compilar para producción
```bash
npm run build
```

---

## 📋 Carga de Datos y Semilla Inicial

La aplicación viene precargada de forma predeterminada con los datos no personales facilitados:

- **Equipo Pre C**:
  - 11 jugadores oficiales: Unai (#1), Mario (#2), Jose (#3), Martín (#4), Gonzalo (#5), Gino (#6), Salvador (#7), Aitor (#8), Aleister (#9), Jorge (#10) y Tokyo (#11).
  - Calendario de 7 jornadas (J1 Montevil, J2 Virgen Inmaculada A, J3 Lealtad C, J4 Gijón Femenino A, J5 Manuel Rubio B, J6 Gijón Perchera, J7 Próximo rival).
  - Sesiones de entrenamiento de martes y jueves desde el 01/09/2026.
  - Asistencia histórica registrada para Salvador Milano y compañeros hasta el 05/11/2026.
- **Equipos Debutantes B y Debutantes A**:
  - Creados con configuración base (5 en pista, 25 min/parte, sin puestos) y aviso visual de configuración pendiente.
- **Perfiles de Usuario para Simulación**:
  - `entrenador@mareo.es` (Admin, acceso a los 3 equipos).
  - `delegado@mareo.es` (Delegado, asignado a Pre C).
  - Se puede alternar entre perfiles en cualquier momento desde el selector de equipos.

### Formato de Importación CSV
Para cargar plantillas reales desde un archivo Excel/CSV:
```csv
Dorsal,Nombre,Apellidos,Puesto
1,Unai,Robledo Sanchez,PT
2,Mario,Berdasco Amandi,Cierre
3,Jose,Diaz Diaz,Ala
7,Salvador,Milano,Pívot
```

---

## 🔒 Privacidad y RGPD (Datos de Menores)

1. **Aislamiento por equipo**: Las políticas RLS impiden que un delegado o usuario sin asignación pueda consultar datos de otro equipo.
2. **Sin analíticas ni rastreo**: Cero scripts de terceros, telemetría o cookies publicitarias.
3. **Derechos ARCO/RGPD**:
   - **Portabilidad**: Botón de "Exportar datos (JSON)" en los ajustes de cada equipo.
   - **Supresión (Derecho al olvido)**: Botón de eliminación definitiva de datos personales del menor en su ficha individual (restringido a Admin).

---

## 🚢 Despliegue en Vercel (Producción UE)

1. Conecta el repositorio a Vercel.
2. En los ajustes de Vercel (*Project Settings* $\rightarrow$ *Environment Variables*), añade:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. En Supabase, ejecuta en orden los scripts SQL `001_initial_schema.sql`, `002_auth_permissions_audit.sql` y `003_shared_app_data.sql` para crear las tablas y políticas RLS en tu base de datos de región Fráncfort (UE).
4. El despliegue generará la PWA instalable con HTTPS nativo.
