-- Limpa dados da fase 2C+ (base mestre / DE-PARA), mantendo Fase 1 e 2.
-- Uso:
--   docker compose up -d db
--   docker compose exec -T db psql -U governanca -d governanca_cadastros -f - < scripts/limpar-tratamento.sql
--
-- Mantém: projetos, lotes, source_records (original/saneado), matching, config de saneamento.
-- Remove: produtos mestre, vínculos DE/PARA, decisões de duplicidade e status de tratamento.

BEGIN;

DELETE FROM product_mappings;
DELETE FROM master_products;
DELETE FROM sanitization_decisions;

UPDATE source_records
SET processing_status = 'SANITIZED'
WHERE processing_status IN ('TREATED', 'INATIVATED');

UPDATE import_batches
SET status = 'MATCHED'
WHERE status = 'COMPLETED';

COMMIT;
