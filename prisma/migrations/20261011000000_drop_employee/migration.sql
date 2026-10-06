-- Remove orphaned Employee table (payroll lives on AdminUser; zero relations).
DROP TABLE IF EXISTS "Employee";
