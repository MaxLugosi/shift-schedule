CREATE TABLE "employees" (
	"id" serial PRIMARY KEY NOT NULL,
	"full_name" text NOT NULL,
	"position" text DEFAULT 'агент' NOT NULL,
	"avatar_url" text,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shift_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL,
	"color" text NOT NULL,
	"hotkey" smallint,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "shift_templates_color_chk" CHECK ("shift_templates"."color" in ('cornflower', 'lavender', 'mint')),
	CONSTRAINT "shift_templates_time_chk" CHECK ("shift_templates"."start_time" <> "shift_templates"."end_time")
);
--> statement-breakpoint
CREATE TABLE "shifts" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"date" date NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL,
	"template_id" integer,
	"published_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "shifts_time_chk" CHECK ("shifts"."start_time" <> "shifts"."end_time")
);
--> statement-breakpoint
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_template_id_shift_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."shift_templates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "shift_templates_hotkey_uq" ON "shift_templates" USING btree ("hotkey");--> statement-breakpoint
CREATE UNIQUE INDEX "shifts_employee_date_uq" ON "shifts" USING btree ("employee_id","date");--> statement-breakpoint
CREATE INDEX "shifts_date_idx" ON "shifts" USING btree ("date");