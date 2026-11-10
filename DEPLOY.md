# Guía de Despliegue en Producción · Cronomister Mareo
**Escuela de Fútbol Mareo · Temporada 2026/2027**

Esta guía paso a paso está pensada para que cualquier persona, sin necesidad de conocimientos técnicos avanzados, pueda desplegar y mantener **Cronomister** en producción de forma 100% segura y con coste cero (nivel gratuito de Supabase y Vercel).

---

## 1. Crear la Base de Datos en Supabase (Gratuito y RGPD UE)

1. Entra en [supabase.com](https://supabase.com) y pulsa en **Start your project** (inicia sesión con tu cuenta de GitHub o email).
2. Haz clic en **New Project**.
3. Rellena los datos:
   - **Name**: `Cronomister Mareo`
   - **Database Password**: Genera una contraseña segura y guárdala.
   - **Region**: Selecciona **Central EU (Frankfurt)**. *Es fundamental por cumplimiento de la normativa española y europea de protección de datos (RGPD/LOPDGDD) al tratar con datos de menores.*
   - **Pricing Plan**: Free.
4. Pulsa **Create new project** y espera 1 minuto a que se aprovisione.

---

## 2. Aplicar las Migraciones y Políticas de Seguridad

1. En el panel izquierdo de Supabase, pulsa en el icono **SQL Editor**.
2. Pulsa en **New Query**.
3. Abre el archivo de tu repositorio `supabase/migrations/001_initial_schema.sql`, copia todo su contenido, pégalo en el editor y pulsa **Run**.
4. Repite el proceso, en este orden, para:
   - `supabase/migrations/002_auth_permissions_audit.sql`
   - `supabase/migrations/003_shared_app_data.sql`
   - `supabase/migrations/004_correct_prec_match_results.sql`
   - `supabase/migrations/005_load_aitor_and_perchera_tracking.sql`
   - `supabase/migrations/006_add_jose_perchera_minutes.sql`
5. *¡Listo!* La migración 003 crea el almacenamiento compartido por equipo y copia roles y permisos existentes desde los metadatos de Supabase Auth a tablas protegidas. La 004 corrige los marcadores históricos de Pre C, la 005 carga el seguimiento confirmado de Aitor y Perchera y la 006 añade los 30 minutos de José Díaz Díaz.

Si ya aplicaste las migraciones 001–003, ejecuta únicamente `supabase/migrations/004_correct_prec_match_results.sql` en una nueva consulta del SQL Editor para actualizar los marcadores que ya están guardados en la base de datos.

Si ya aplicaste también la migración 004, ejecuta únicamente `supabase/migrations/005_load_aitor_and_perchera_tracking.sql` para cargar los minutos y asistencias históricas en Supabase.

Si ya aplicaste las migraciones 004 y 005, ejecuta únicamente `supabase/migrations/006_add_jose_perchera_minutes.sql` para añadir los minutos de José Díaz Díaz en Perchera.

---

## 3. Desactivar el Registro Público (Solo Invitación)

Por seguridad y privacidad de los menores:
1. En Supabase, ve al menú izquierdo: **Authentication** -> **Providers** -> **Email**.
2. Asegúrate de que **Enable Email provider** esté activo.
3. Desmarca la opción **"Allow new users to sign up"** (Permitir registro a nuevos usuarios).
4. Guarda los cambios. A partir de ahora, **nadie** podrá registrarse por su cuenta en la web; solo entrarán las personas que invites desde el Panel de Administración.

---

## 4. Desplegar en Vercel (Hosting Web Gratuito)

1. Entra en [vercel.com](https://vercel.com) e inicia sesión con tu cuenta de GitHub (`OLOBOC`).
2. Pulsa en **Add New...** -> **Project**.
3. Selecciona tu repositorio: `OLOBOC/Cronomister`.
4. En la configuración del proyecto, abre **Environment Variables** y añade:
   - `NEXT_PUBLIC_SUPABASE_URL`: Tu URL del proyecto (ej: `https://abcdefgh.supabase.co`).
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Tu clave pública `anon` `public`.
   - `SUPABASE_SERVICE_ROLE_KEY`: La clave secreta `service_role` de Supabase, en **Project Settings** -> **API Keys**. **No** uses el prefijo `NEXT_PUBLIC_` ni la compartas; solo la usan las rutas seguras del servidor.
5. Pulsa el botón **Deploy**. En 2 minutos tendrás tu web en marcha con dirección `https://cronomister-xxxx.vercel.app` (y certificado SSL/HTTPS automático).

---

## 5. Acceso y Primer Uso

### Inicializar los datos compartidos
- Después de aplicar la migración 003 y desplegar las variables, inicia sesión primero con la cuenta de administrador desde el navegador que contiene los datos más actualizados.
- En ese primer acceso, los datos locales de cada equipo que aún no exista en la base de datos se copiarán a Supabase. A partir de ahí, las ediciones del admin y las asistencias se guardan en la nube y se reflejan en los demás dispositivos en un máximo aproximado de 10 segundos mientras la app está abierta.
- Los delegados pueden entrar después desde sus móviles. No borres los datos locales del navegador del admin hasta confirmar que los equipos ya están cargados en Supabase.

### Acceso del Entrenador Principal (Admin)
- **Email**: `entrenador@mareo.es`
- **Contraseña inicial**: `mareo2026`
- Una vez dentro, en la esquina superior derecha verás el botón dorado **Admin** que abre el Panel de Administración exclusivo.

### Cómo Invitar a un Delegado
1. Pulsa en el botón **Admin** de la cabecera.
2. En la pestaña **Usuarios y Permisos**, pulsa **Invitar Delegado**.
3. Introduce el nombre y email del delegado, y selecciona a qué equipos tendrá acceso (Pre C, Debutantes A o Debutantes B).
4. El sistema le asignará una contraseña temporal y los permisos por defecto:
   - ✅ Pasar lista
   - ✅ Convocatoria y alineaciones
   - ✅ Iniciar y controlar cronómetro de partido
   - ✅ Anotar observaciones
   - ❌ Modificar actas históricas (bloqueado)
   - ❌ Descargar informes PDF (bloqueado)
   - ❌ Ver estadísticas de equipo (bloqueado)
5. Si deseas que un delegado concreto pueda descargar PDFs o ver estadísticas, basta con encender los interruptores correspondientes dentro de su ficha.

### Enlace que debes enviar a tus delegados
Envía a los delegados la dirección web generada por Vercel con este mensaje modelo:
```text
Hola [Nombre],
Ya tienes acceso como delegado a Cronomister Mareo:
Enlace: https://tu-dominio-cronomister.vercel.app
Usuario: [su-email]
Contraseña provisional: [la-contraseña-asignada]
Al entrar en el móvil, puedes añadir el icono a la pantalla de inicio para usarla como una aplicación.
```

---

## 6. Instalación en el Móvil como App (PWA)

Cronomister funciona como Progressive Web App (PWA) instalable en el teléfono:

- **En Android (Chrome)**:
  1. Abre el enlace en Google Chrome.
  2. Pulsa en el menú de tres puntos (arriba a la derecha).
  3. Selecciona **"Añadir a la pantalla de inicio"** o **"Instalar aplicación"**.
  4. Aparecerá el icono rojo con la "M" de Mareo en tu escritorio como cualquier app nativa.

- **En iPhone (Safari)**:
  1. Abre el enlace en Safari.
  2. Pulsa en el icono de Compartir (el cuadrado con la flecha hacia arriba en la barra inferior).
  3. Desplaza hacia abajo y pulsa **"Añadir a la pantalla de inicio"**.
  4. Pulsa **Añadir**.

---

## 7. Mantenimiento y Operaciones Frecuentes

### ¿Cómo desactivar a un delegado que ya no colabora?
1. Entra al Panel de **Admin**.
2. En la lista de usuarios, busca al delegado y pulsa el botón de encendido/apagado (Power).
3. Su estado pasará a **Desactivado** y el servidor rechazará cualquier intento de acceso o sincronización de inmediato.

### ¿Cómo hacer una copia de seguridad (Backup)?
1. En Supabase: ve a **Database** -> **Backups** (Supabase realiza copias automáticas diarias).
2. También puedes pulsar en el menú de cada equipo en Cronomister y utilizar la opción de exportación completa en formato JSON para guardar un duplicado en tu ordenador.

### ¿Dónde consultar el registro de auditoría legal (RGPD)?
En el panel de **Admin**, entra en la pestaña **Registro de Auditoría**. Allí queda registrada de forma inalterable cada acción realizada (quién inició sesión, asistencias pasadas, cambios de minutos, fecha, hora y valores previos).
