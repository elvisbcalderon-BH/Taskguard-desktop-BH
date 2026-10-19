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
