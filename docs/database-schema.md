# Схема базы данных

Проект использует гибридную архитектуру БД:
- **PostgreSQL** — операционный слой (пользователи, аудит, ETL-импорты, избранное)
- **Neo4j** — медицинский knowledge graph (препараты, вещества, показания, противопоказания, побочные эффекты)

---

## PostgreSQL — ER-диаграмма

```mermaid
erDiagram
    USERS {
        bigserial  id            PK
        varchar255 email         "UNIQUE"
        varchar255 password_hash
        varchar255 full_name
        varchar255 organization
        varchar50  role          "client|doctor|hr|admin"
        boolean    is_active
        timestamp  created_at
        timestamp  updated_at
    }

    AUDIT_LOGS {
        bigserial  id          PK
        bigint     user_id     FK
        varchar50  action      "LOGIN|SEARCH_DRUG|..."
        varchar50  entity_type
        varchar100 entity_id
        jsonb      old_values
        jsonb      new_values
        inet       ip_address
        timestamp  created_at
    }

    DRUG_IMPORTS {
        bigserial  id                PK
        varchar255 source            "grls_20250401.xml"
        varchar20  status            "pending|running|completed|failed"
        int        records_processed
        int        records_failed
        timestamp  started_at
        timestamp  completed_at
        text       error_log
        bigint     created_by        FK
        bigint     audit_id          FK
        timestamp  created_at
    }

    USER_FAVORITES {
        bigint     user_id   FK
        varchar100 drug_id   "← Neo4j Drug.id"
        timestamp  created_at
    }

    USERS       ||--o{ AUDIT_LOGS     : "user_id"
    USERS       ||--o{ DRUG_IMPORTS   : "created_by"
    USERS       ||--o{ USER_FAVORITES : "user_id"
    AUDIT_LOGS  ||--o{ DRUG_IMPORTS   : "audit_id"
```

---

## PostgreSQL — DDL

```sql
CREATE TABLE users (
  id            BIGSERIAL PRIMARY KEY,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name     VARCHAR(255) NOT NULL,
  organization  VARCHAR(255),
  role          VARCHAR(50)  NOT NULL CHECK (role IN ('client', 'doctor', 'hr', 'admin')),
  is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMP    NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE TABLE audit_logs (
  id          BIGSERIAL PRIMARY KEY,
  user_id     BIGINT REFERENCES users(id) ON DELETE SET NULL,
  action      VARCHAR(50)  NOT NULL,
  entity_type VARCHAR(50)  NOT NULL,
  entity_id   VARCHAR(100) NOT NULL,
  old_values  JSONB,
  new_values  JSONB,
  ip_address  INET,
  created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE drug_imports (
  id                BIGSERIAL PRIMARY KEY,
  source            VARCHAR(255) NOT NULL,
  status            VARCHAR(20)  NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  records_processed INT          NOT NULL DEFAULT 0,
  records_failed    INT          NOT NULL DEFAULT 0,
  started_at        TIMESTAMP,
  completed_at      TIMESTAMP,
  error_log         TEXT,
  created_by        BIGINT REFERENCES users(id) ON DELETE SET NULL,
  audit_id          BIGINT REFERENCES audit_logs(id) ON DELETE SET NULL,
  created_at        TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE user_favorites (
  user_id    BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  drug_id    VARCHAR(100) NOT NULL,
  created_at TIMESTAMP   NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, drug_id)
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity  ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_drug_imports_status ON drug_imports(status);
```

---

## Neo4j — Граф знаний

```mermaid
flowchart LR
    D(["💊 Drug
    id · name · form
    atcCode · manufacturer
    dosageAdult · dosageChildren
    storageConditions · shelfLife
    dispensingRule · pharmacodynamics"])

    S(["🧪 Substance
    id · name · canonicalName
    atcCode · description · group"])

    I(["✅ Indication
    id · name
    icd10Code · description"])

    C(["🚫 Contraindication
    id · name · description"])

    SE(["⚠️ SideEffect
    id · name
    frequency · description"])

    PG(["🗂️ PharmGroup
    id · name
    parentGroupId · description"])

    D -- "CONTAINS" --> S
    D -- "INDICATED_FOR" --> I
    D -- "CONTRAINDICATED_FOR" --> C
    D -- "CAUSES" --> SE
    D -- "BELONGS_TO" --> PG
    S -- "INTERACTS_WITH\nrisk: HIGH|MEDIUM|LOW" --> S
    PG -- "PARENT_OF" --> PG

    style D  fill:#01696f,color:#fff
    style S  fill:#006494,color:#fff
    style I  fill:#437a22,color:#fff
    style C  fill:#a12c7b,color:#fff
    style SE fill:#964219,color:#fff
    style PG fill:#7a39bb,color:#fff
```

### Узлы и свойства

| Узел | Свойства |
|---|---|
| `Drug` | `id`, `name`, `form`, `manufacturer`, `registrationNumber`, `atcCode`, `dosageAdult`, `dosageChildren`, `storageConditions`, `shelfLife`, `dispensingRule`, `pharmacodynamics` |
| `Substance` | `id`, `name`, `canonicalName`, `atcCode`, `description` |
| `Indication` | `id`, `name`, `icd10Code`, `description` |
| `Contraindication` | `id`, `name`, `description` |
| `SideEffect` | `id`, `name`, `frequency` (VERYCOMMON\|COMMON\|UNCOMMON\|RARE\|VERYRARE), `description` |
| `PharmacologicalGroup` | `id`, `name`, `parentGroupId`, `description` |

### Связи

| Связь | От → До | Свойства |
|---|---|---|
| `CONTAINS` | Drug → Substance | — |
| `INDICATED_FOR` | Drug → Indication | — |
| `CONTRAINDICATED_FOR` | Drug → Contraindication | — |
| `CAUSES` | Drug → SideEffect | — |
| `BELONGS_TO` | Drug → PharmGroup | — |
| `INTERACTS_WITH` | Substance → Substance | `risk: HIGH\|MEDIUM\|LOW` |
| `PARENT_OF` | PharmGroup → PharmGroup | — |

---

## Neo4j — Constraints и индексы

```cypher
CREATE CONSTRAINT drug_id IF NOT EXISTS
FOR (d:Drug) REQUIRE d.id IS UNIQUE;

CREATE CONSTRAINT substance_id IF NOT EXISTS
FOR (s:Substance) REQUIRE s.id IS UNIQUE;

CREATE CONSTRAINT indication_id IF NOT EXISTS
FOR (i:Indication) REQUIRE i.id IS UNIQUE;

CREATE CONSTRAINT contraindication_id IF NOT EXISTS
FOR (c:Contraindication) REQUIRE c.id IS UNIQUE;

CREATE CONSTRAINT sideeffect_id IF NOT EXISTS
FOR (s:SideEffect) REQUIRE s.id IS UNIQUE;

CREATE CONSTRAINT group_id IF NOT EXISTS
FOR (g:PharmacologicalGroup) REQUIRE g.id IS UNIQUE;
```

---

## Примеры Cypher-запросов

```cypher
-- Все вещества препарата и их взаимодействия
MATCH (d:Drug {id: "drug001"})-[:CONTAINS]->(s:Substance)
OPTIONAL MATCH (s)-[r:INTERACTS_WITH]->(s2:Substance)
RETURN d.name, s.name, r.risk, s2.name;

-- Аналоги по фармакологической группе
MATCH (d:Drug {id: "drug001"})-[:BELONGS_TO]->(g:PharmacologicalGroup)
      <-[:BELONGS_TO]-(analog:Drug)
WHERE analog.id <> d.id
RETURN analog.name, analog.form, analog.dispensingRule;

-- Препараты, противопоказанные при диагнозе МКБ-10
MATCH (d:Drug)-[:CONTRAINDICATED_FOR]->(c:Contraindication),
      (d)-[:INDICATED_FOR]->(i:Indication {icd10Code: "I10"})
RETURN d.name, collect(c.name) AS contraindications;

-- Частые побочные эффекты препарата
MATCH (d:Drug {id: "drug001"})-[:CAUSES]->(se:SideEffect)
WHERE se.frequency IN ["VERYCOMMON", "COMMON"]
RETURN se.name, se.frequency
ORDER BY se.frequency;
```

---

## Связь PostgreSQL ↔ Neo4j

Обе базы связаны через строковый `drug_id` (формат `drug001`, `drug002`, ...):
- `USER_FAVORITES.drug_id` ссылается на `Drug.id` в Neo4j
- `AUDIT_LOGS.entity_id` при `entity_type = 'drug'` также содержит Neo4j `Drug.id`
- NestJS API Gateway агрегирует данные обеих БД в единый DTO для React-клиента
