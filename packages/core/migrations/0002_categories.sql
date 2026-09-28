INSERT INTO categories (slug, name, description, icon, color, sort_order, active_from, extra_fields) VALUES
  ('bache', 'Bache', 'Pozos y calles rotas', '🕳️', '#e8590c', 10, NULL, '[]'),
  ('inseguridad', 'Inseguridad', 'Robos, zonas peligrosas, falta de patrullaje', '🚨', '#c92a2a', 20, NULL, '[]'),
  ('raudal', 'Raudal / inundación', 'Calles que se inundan con la lluvia', '🌊', '#1971c2', 30, NULL, '[]'),
  ('vertedero-ilegal', 'Vertedero ilegal', 'Basura acumulada o quema en lugares no habilitados', '🗑️', '#5c940d', 40, NULL, '[]'),
  ('propaganda-electoral', 'Propaganda electoral fuera de fecha', 'Carteles y pintatas de campaña que siguen después de las elecciones', '🗳️', '#862e9c', 50, NULL,
    '[{"key":"partido","label":"Partido o movimiento","type":"text"},{"key":"candidato","label":"Candidato","type":"text"}]'),
  ('alumbrado', 'Alumbrado público', 'Focos quemados o calles a oscuras', '💡', '#f59f00', 60, NULL, '[]'),
  ('semaforo', 'Semáforo', 'Semáforos apagados o dañados', '🚦', '#d9480f', 70, NULL, '[]'),
  ('arbol-caido', 'Árbol caído / riesgo', 'Árboles caídos o con riesgo de caer', '🌳', '#2b8a3e', 80, NULL, '[]'),
  ('perdida-agua', 'Pérdida de agua', 'Caños rotos y agua desperdiciada', '💧', '#1098ad', 90, NULL, '[]'),
  ('cloaca', 'Cloaca / desagüe', 'Desbordes cloacales y desagües tapados', '🚽', '#795548', 100, NULL, '[]'),
  ('vereda', 'Veredas y accesibilidad', 'Veredas rotas, rampas faltantes, obstrucciones', '♿', '#495057', 110, NULL, '[]'),
  ('animales', 'Animales sueltos', 'Animales abandonados o sueltos en la vía', '🐕', '#a16207', 120, NULL, '[]'),
  ('ruido', 'Ruido', 'Contaminación sonora', '🔊', '#9c36b5', 130, NULL, '[]'),
  ('transporte', 'Transporte público', 'Paradas, frecuencias, unidades en mal estado', '🚌', '#0b7285', 140, NULL, '[]'),
  ('otros', 'Otros', 'Cualquier otro problema de la comunidad', '📍', '#868e96', 999, NULL, '[]')
ON CONFLICT (slug) DO NOTHING;
