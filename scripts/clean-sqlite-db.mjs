import fs from "fs";
import path from "path";

const files = [
  path.join(process.cwd(), "prisma", "dev.db"),
  path.join(process.cwd(), "prisma", "dev.db-journal"),
  path.join(process.cwd(), "prisma", "dev.db-wal"),
  path.join(process.cwd(), "prisma", "dev.db-shm"),
];
for (const file of files) {
  try {
    if (fs.existsSync(file)) {
      fs.unlinkSync(file);
      console.log(`Removed ${file}`);
    }
  } catch (error) {
    console.warn(`Could not remove ${file}:`, error?.message || error);
  }
}
