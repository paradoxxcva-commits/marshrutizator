# Nearby Search с кэшированием — Маршрутизатор

## Зачем

Google Places API имеет лимит 100 запросов/день. Чтобы свести реальные запросы к минимуму, реализован прокси-слой с долгосрочным кэшированием в SQLite. Кафе, достопримечательности и другие POI статичны — их координаты меняются редко.

## Архитектура

```
Клиент → GET /api/maps/nearby → MapsController → MapsService → getNearbyPlaces()
                                                                    ↓
                                                          Проверка кэша (Haversine ≤ 2km)
                                                          ↓ есть                ↓ нет
                                                        Отдаёт из БД      Проверка лимита (90/день)
                                                                           ↓ есть              ↓ нет
                                                                         429 ошибка     Google Nearby Search API
                                                                                          ↓
                                                                                   Сохранение в кэш + инкремент счётчика
```

## Файлы

### БД: `server/src/db/schema.ts`
Добавлены 2 таблицы:

```sql
-- Кэш результатов Nearby Search
CREATE TABLE places_nearby_cache (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lat REAL NOT NULL,          -- координаты центра поиска
  lng REAL NOT NULL,
  radius INTEGER NOT NULL,    -- радиус в метрах
  data TEXT NOT NULL,         -- JSON массив результатов Google
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX idx_places_cache_coords ON places_nearby_cache(lat, lng);

-- Суточный счётчик запросов к Google
CREATE TABLE google_api_usage (
  date TEXT PRIMARY KEY,      -- 'YYYY-MM-DD'
  count INTEGER DEFAULT 0
);
```

### Сервис: `server/src/services/mapsService.ts`
Основные функции:

| Функция | Описание |
|---------|----------|
| `haversineDistance(lat1, lng1, lat2, lng2)` | Расстояние между точками в метрах |
| `getTodayKey()` | Текущая дата YYYY-MM-DD |
| `getDailyUsage()` | Чтение счётчика из БД |
| `incrementDailyUsage()` | Инкремент счётчика (UPSERT) |
| `getNearbyPlaces(lat, lng, radius, apiKey?)` | Основной метод |

**Логика `getNearbyPlaces`:**
1. Проверка кэша: ищем запись с `updated_at` не старше 30 дней, проверяем Haversine ≤ 2km
2. Если кэш есть → возвращаем immediately (source: "cache")
3. Если кэша нет → проверяем суточный лимит (max 90)
4. Если лимит превышен → ошибка 429
5. Если лимит не превышен → HTTP запрос к Google Places Nearby Search API
6. Сохраняем результат в кэш, инкрементируем счётчик

**Ключевые константы:**
- `NEARBY_CACHE_RADIUS_M = 2000` — радиус попадания в кэш (2 км)
- `NEARBY_CACHE_TTL_DAYS = 30` — время жизни кэша
- `NEARBY_DAILY_LIMIT = 90` — максимум запросов к Google в день (запас 10 на ошибки)

### Контроллер: `server/src/nest/maps/maps.controller.ts`
```
GET /api/maps/nearby?lat=55.7558&lng=37.6173&radius=1000
```
Query-параметры: `lat` (number), `lng` (number), `radius` (number, optional, default 1500)

### NestJS сервис: `server/src/nest/maps/maps.service.ts`
Метод `nearby(userId, lat, lng, radius)` — проксирует вызов, берёт API ключ из `getMapsKey(userId)`.

### Клиент: `client/src/api/client.ts`
```typescript
mapsApi.nearby(lat, lng, radius) // → GET /api/maps/nearby
```

## Тестирование

**Первый запрос** (кэш пуст):
```bash
GET /api/maps/nearby?lat=55.7558&lng=37.6173&radius=1000
→ { source: "google", places: [...20 мест...] }
```

**Повторный запрос** (кэш есть):
```bash
GET /api/maps/nearby?lat=55.7558&lng=37.6173&radius=1000
→ { source: "cache", cached_at: "2026-07-02 08:55:26", places: [...20 мест...] }
```

**Лимит запросов:**
```sql
SELECT * FROM google_api_usage;
-- [{"date": "2026-07-02", "count": 1}]
```

## Ограничения Google Places Nearby Search API

- Максимум 20 результатов за запрос
- Радиус: 50м — 50000м
- Не возвращает часы работы (нужен Details API)
- Требует billing-enabled аккаунт Google Cloud
