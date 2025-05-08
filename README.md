# Database Setup Instructions

This folder contains the SQL files needed to set up the Aerosense database.

## Prerequisites

1. PostgreSQL 12 or higher
2. PostGIS extension installed

## Setup Steps

1. Create the database:
```sql
CREATE DATABASE aerosense;
```

2. Connect to the database:
```sql
\c aerosense
```

3. Run the schema file to create tables and indexes:
```sql
\i schema.sql
```

4. (Optional) Run the seed file to populate sample data:
```sql
\i seed.sql
```

## Table Structure

### users
- Stores user account information
- Fields: id, full_name, email, password, created_at, updated_at

### plots
- Stores agricultural field information
- Fields: id, name, area, location (PostGIS point), soil_type, status, user_id, created_at, updated_at

### crops
- Stores crop information for each plot
- Fields: id, name, variety, planting_date, expected_harvest_date, status, yield, plot_id, created_at, updated_at

### sensor_data
- Stores sensor readings
- Fields: id, sensor_type, value, unit, timestamp, location (PostGIS point), plot_id, created_at, updated_at

### alerts
- Stores system alerts and notifications
- Fields: id, type, message, severity, status, source, user_id, plot_id, created_at, updated_at

## Notes

- All tables include created_at and updated_at timestamps
- Updated_at is automatically maintained by triggers
- Foreign key constraints ensure data integrity
- Indexes are created for better query performance
- PostGIS is used for spatial data (location fields) 