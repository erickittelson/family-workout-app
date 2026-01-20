import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL!);

async function migrate() {
  console.log("Starting migration from Family to Circle...");

  try {
    // Step 1: Check if tables exist
    const tablesResult = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('families', 'family_members', 'circles', 'circle_members')
    `;

    const existingTables = tablesResult.map(r => r.table_name);
    console.log("Existing tables:", existingTables);

    // Step 2: Rename families -> circles if needed
    if (existingTables.includes('families') && !existingTables.includes('circles')) {
      console.log("Renaming 'families' to 'circles'...");
      await sql`ALTER TABLE families RENAME TO circles`;
    }

    // Step 3: Rename family_members -> circle_members if needed
    if (existingTables.includes('family_members') && !existingTables.includes('circle_members')) {
      console.log("Renaming 'family_members' to 'circle_members'...");
      await sql`ALTER TABLE family_members RENAME TO circle_members`;
    }

    // Step 4: Rename family_id column to circle_id in circle_members
    const columnsResult = await sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'circle_members'
      AND column_name IN ('family_id', 'circle_id')
    `;

    const existingColumns = columnsResult.map(r => r.column_name);
    console.log("Existing columns in circle_members:", existingColumns);

    if (existingColumns.includes('family_id') && !existingColumns.includes('circle_id')) {
      console.log("Renaming 'family_id' to 'circle_id' in circle_members...");
      await sql`ALTER TABLE circle_members RENAME COLUMN family_id TO circle_id`;
    }

    // Step 5: Add profile_picture column if not exists
    const profilePicResult = await sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'circle_members'
      AND column_name = 'profile_picture'
    `;

    if (profilePicResult.length === 0) {
      console.log("Adding 'profile_picture' column to circle_members...");
      await sql`ALTER TABLE circle_members ADD COLUMN profile_picture text`;
    }

    // Step 6: Add role column if not exists
    const roleResult = await sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'circle_members'
      AND column_name = 'role'
    `;

    if (roleResult.length === 0) {
      console.log("Adding 'role' column to circle_members...");
      await sql`ALTER TABLE circle_members ADD COLUMN role text DEFAULT 'member'`;
    }

    // Step 7: Create circle_equipment table if not exists
    const equipmentTableResult = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = 'circle_equipment'
    `;

    if (equipmentTableResult.length === 0) {
      console.log("Creating 'circle_equipment' table...");
      await sql`
        CREATE TABLE circle_equipment (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          circle_id uuid NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
          name text NOT NULL,
          category text NOT NULL,
          description text,
          quantity integer DEFAULT 1,
          brand text,
          model text,
          is_from_marketplace boolean DEFAULT false,
          created_at timestamp DEFAULT now() NOT NULL
        )
      `;
      await sql`CREATE INDEX circle_equipment_circle_idx ON circle_equipment(circle_id)`;
    }

    // Step 8: Create equipment_marketplace table if not exists
    const marketplaceTableResult = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = 'equipment_marketplace'
    `;

    if (marketplaceTableResult.length === 0) {
      console.log("Creating 'equipment_marketplace' table...");
      await sql`
        CREATE TABLE equipment_marketplace (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          name text NOT NULL,
          category text NOT NULL,
          description text,
          image_url text,
          common_brands jsonb,
          popularity integer DEFAULT 0
        )
      `;
    }

    // Step 9: Update foreign key references in other tables that reference family_id
    // Check for workout_plans table
    const workoutPlansColumns = await sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'workout_plans'
      AND column_name IN ('family_id', 'circle_id')
    `;

    const wpColumns = workoutPlansColumns.map(r => r.column_name);
    if (wpColumns.includes('family_id') && !wpColumns.includes('circle_id')) {
      console.log("Renaming 'family_id' to 'circle_id' in workout_plans...");
      await sql`ALTER TABLE workout_plans RENAME COLUMN family_id TO circle_id`;
    }

    console.log("Migration completed successfully!");

  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

migrate();
