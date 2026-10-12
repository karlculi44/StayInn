ALTER TABLE "Reservation" ADD COLUMN "referenceId" TEXT;

DO $$
DECLARE
  reservation_record RECORD;
  alphabet CONSTANT TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  reference_id TEXT;
  segment TEXT;
  attempt INTEGER;
  character_index INTEGER;
BEGIN
  FOR reservation_record IN
    SELECT "id" FROM "Reservation" WHERE "referenceId" IS NULL
  LOOP
    attempt := 0;
    LOOP
      attempt := attempt + 1;
      segment := '';

      FOR character_index IN 1..4 LOOP
        segment := segment || substr(alphabet, floor(random() * length(alphabet))::INTEGER + 1, 1);
      END LOOP;

      reference_id := 'STY-' || segment || '-';
      segment := '';

      FOR character_index IN 1..4 LOOP
        segment := segment || substr(alphabet, floor(random() * length(alphabet))::INTEGER + 1, 1);
      END LOOP;

      reference_id := reference_id || segment;

      EXIT WHEN NOT EXISTS (
        SELECT 1 FROM "Reservation" WHERE "referenceId" = reference_id
      );

      IF attempt >= 10 THEN
        RAISE EXCEPTION 'Could not generate a unique reservation reference ID';
      END IF;
    END LOOP;

    UPDATE "Reservation"
    SET "referenceId" = reference_id
    WHERE "id" = reservation_record."id";
  END LOOP;
END $$;

ALTER TABLE "Reservation" ALTER COLUMN "referenceId" SET NOT NULL;
CREATE UNIQUE INDEX "Reservation_referenceId_key" ON "Reservation"("referenceId");
