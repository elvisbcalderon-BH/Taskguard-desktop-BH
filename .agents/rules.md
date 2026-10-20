# Global Standards & Autonomous Engineering Rules

Este proyecto tiene reglas activas de forma permanente. El asistente debe aplicar SIEMPRE los siguientes estándares en cada respuesta o cambio de código:

## 1. Estándares de Diseño y Frontend (Taste & Web Guidelines)
- **Anti-AI-Slop (Taste Skill)**: Prohibido generar layouts genéricos de tres columnas con tarjetas idénticas, gradientes púrpura predecibles o textos centrados sin jerarquía.
- **Tipografía y Jerarquía**: Utilizar fuentes modernas (ej. Inter, Geist, Outfit). Cuidar el contraste de grises/colores, espaciado rítmico (padding/margin consistentes) y micro-interacciones suaves en estados hover/active.
- **Estándares de Interfaz Web (Web Interface Guidelines)**:
  - Todo elemento interactivo debe tener accesibilidad (labels, roles ARIA, enfoque por teclado visible).
  - Estados vacíos (empty states) explicativos y estados de carga (skeletons/spinners) consistentes.
  - Diseño responsivo y adaptable.
- **Inspiración de Marcas de Élite (DESIGN.md)**: Seguir la densidad visual, paletas sobrias y bordes sutiles inspirados en plataformas como Supabase, Linear o Vercel.

## 2. Estándares de Programación e Ingeniería de Software (ECC)
- **Seguridad primero (Security Hardening)**:
  - Sanitizar entradas, validar esquemas y evitar inyecciones SQL / XSS.
  - No exponer claves secretas (service_role de Supabase o API keys privadas en el cliente).
  - Manejo de permisos RLS estricto en Supabase.
- **Patrones de Backend y Arquitectura Limpia (Backend Patterns & API Design)**:
  - Separar responsabilidades (servicios, controladores, acceso a datos).
  - Códigos de error semánticos y mensajes de fallo claros y estructurados.
  - Manejo robusto de errores con bloques try/catch y logs informativos.
- **Verificación y Pruebas**:
  - Validar los cambios de código antes de darlos por concluidos.
  - Mantener los componentes modulares y desacoplados para facilitar pruebas unitarias y de integración.

## 3. Regla Obligatoria de Despliegue: Conector GitHub Auto-Updater en Todo Programa
Cada vez que se diseñe, construya o actualice una aplicación de escritorio o web en el ecosistema, es **REGLA OBLIGATORIA** integrar el conector de actualización continua con GitHub:
- **Chequeo Interno en Segundo Plano (Cada 3 Horas)**:
  - El componente raíz debe incluir un temporizador cíclico cada 3 horas (`3 * 60 * 60 * 1000` ms) que consulte la API de commits de GitHub (`/repos/:owner/:repo/commits/main`) para verificar si existe una nueva versión (`remoteSha !== CURRENT_COMMIT_HASH`).
  - Si hay actualización disponible, mostrar banner superior interactivo con botón *"Refresh to Apply"* e indicador visual animado (*"Update Ready"*).
- **Botón Manual de Sincronización en Header (`☁️ vX.X`)**:
  - En la barra superior debe existir siempre un botón visible con la versión actual que permita al usuario forzar la comprobación en tiempo real.
- **Sincronización Automática en Lanzador (`launch-production.bat`)**:
  - El script lanzador de producción debe ejecutar de forma silenciosa un `git pull origin main` al abrirse para garantizar que cualquier PC obtenga las últimas mejoras antes de inicializar la ventana.
- **Persistencia Híbrida Segura**:
  - Todos los datos del usuario deben sincronizarse con la base de datos remota (Supabase) y tener respaldo reactivo en `localStorage` para que la información se comparta en tiempo real entre múltiples PCs sin sobrescribirse.

