# Menú Familiar

Planificador semanal de comidas, snacks, meriendas y cenas a partir del menú del colegio.
Es una página estática: se publica gratis en **GitHub Pages**, y los datos se guardan en **Supabase**
(plan gratuito), sincronizados entre el móvil y el ordenador y compartidos por la familia.

## Qué contiene

| Archivo | Para qué sirve |
|---|---|
| `index.html` | La aplicación completa |
| `db.js` | Conexión con Supabase (sesión, lectura, guardado y tiempo real) |
| `config.js` | **Tienes que editarlo**: URL y clave anon de tu proyecto de Supabase |
| `supabase/schema.sql` | Crea la tabla, las reglas de acceso y la lista de emails permitidos |
| `supabase/seed.sql` | Tus datos actuales: recetas, menús del cole de septiembre a noviembre, semanas guardadas y ajustes |
| `manifest.webmanifest`, `icon.svg` | Para añadirla a la pantalla de inicio del móvil |

## Puesta en marcha (unos 15 minutos)

### 1. Supabase
1. Crea una cuenta en https://supabase.com y un proyecto nuevo (región Europa, plan gratuito).
2. Abre **SQL Editor → New query**, pega el contenido de `supabase/schema.sql`,
   **cambia los dos emails del final por los vuestros** y pulsa **Run**.
3. Nueva consulta: pega `supabase/seed.sql` y pulsa **Run**. Carga todos tus datos.
4. En **Project Settings → API** copia **Project URL** y la clave **anon public**.

### 2. Código
1. Abre `config.js` y pega esos dos valores.
2. Crea un repositorio en GitHub (por ejemplo `menu-familiar`) y sube **todos** los archivos de esta carpeta,
   incluido `.nojekyll`. Desde la web: *Add file → Upload files* y arrastra el contenido de la carpeta.

### 3. GitHub Pages
1. En el repositorio: **Settings → Pages → Build and deployment → Source: Deploy from a branch**,
   rama `main`, carpeta `/ (root)` → **Save**.
2. En un minuto la app estará en `https://TU-USUARIO.github.io/menu-familiar/`.

### 4. Enlaces de acceso
En Supabase, **Authentication → URL Configuration**:
- **Site URL**: `https://TU-USUARIO.github.io/menu-familiar/`
- **Redirect URLs**: añade la misma dirección.

Sin esto, el enlace del email te llevaría a una dirección equivocada.

## Uso
- Entra con tu email: llega un enlace de acceso, sin contraseña. Solo pueden entrar los emails de la tabla `members`.
- Para añadir a alguien: en el SQL Editor, `insert into public.members (email) values ('nuevo@email.com');`
- En el móvil: abre la dirección y elige «Añadir a pantalla de inicio».
- **Menú del cole nuevo**: escríbelo en la pestaña «Menú del cole» o importa un JSON en Ajustes → «Importar archivo JSON».
  Formato de una semana (el lunes como identificador):
  ```json
  {"app":"menu-familiar","school":{"2026-12-07":{"weekId":"2026-12-07","updated":1,"days":{
    "2026-12-08":{"primero":"Crema de verduras","segundo":"Merluza al horno","guarnicion":"Ensalada","postre":"Fruta",
                  "prot":["pblanco"],"base":"verdura","postreTipo":"fruta","sug":"Arroz integral · carne magra · pan, fruta"}}}}}
  ```
  `prot`: carne, pblanco, pazul, huevo, legumbre (la primera es la del segundo plato). `base`: cereal, patata, legumbre o verdura.
  `postreTipo`: fruta, lacteo o ambos. `sug`: la cena recomendada por el cole (opcional).
- **Copia de seguridad**: Ajustes → «Descargar copia». El mismo archivo se puede volver a importar.

## Seguridad
- La clave anon de `config.js` es pública por diseño. Los datos están protegidos por las reglas RLS de `schema.sql`:
  solo los emails de `members` pueden leer o escribir.
- El repositorio puede ser público; no contiene datos (salvo `seed.sql`, que **no** hace falta subir:
  puedes borrarlo del repositorio después de ejecutarlo).

## Diferencias con la versión de Claude
- Sin importación automática del PDF del cole ni sugerencias de recetas con IA (necesitarían una clave de pago).
- Todo lo demás es igual: generador semanal, reglas del cole, equilibrio del plato, platos ligeros, guarniciones,
  snack y merienda de fiambrera, Peli y pizza, anclar días, comer fuera y replanificar.
