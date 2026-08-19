CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER plans_set_updated_at
BEFORE UPDATE ON "plans"
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
CREATE TRIGGER templates_set_updated_at
BEFORE UPDATE ON "templates"
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
